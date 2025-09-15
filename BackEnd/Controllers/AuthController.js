const User = require('../Models/User');
const { GenerateToken, generateTempPolicyToken } = require('../Utils/GenrateToken');
const Building = require('../Models/Building');
const crypto = require('crypto');
const { sendTwoFaVerificationEmail,sendVerificationEmail } = require('../Utils/Email');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified" });

    // Générer un nouveau token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpire = Date.now() + 1000 * 60 * 60 * 24;
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;
    await sendVerificationEmail(email, verifyUrl, user.language);
    res.json({ message: "Verification email sent" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
//verify email function
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Invalid or missing token" });

  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


//Register new user

const Subscription = require('../Models/Subscription');

const registerUser = async (req, res) => {
  const { firstName, lastName, email, password, phoneNumber, role, SubRole, buildingId, country, city, language } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate building exists if provided
    let building;
    if (buildingId) {
      building = await Building.findById(buildingId);
      if (!building) {
        return res.status(400).json({ message: 'Building not found' });
      }
    }

    // SyndicateCoowner are inactive by default - THIS IS CORRECT
    const isActiveValue = (role === 'SyndicateCoowner') ? false : true;

    // Générer un token de vérification
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpire = Date.now() + 1000 * 60 * 60 * 24; // 24h

    // Prepare subscription for SyndicateAdmin: assign free pack (price 0)
    let subscription = undefined;
    if (role === 'SyndicateAdmin') {
      const freePack = await Subscription.findOne({ price: 0, status: 'active' });
      if (freePack) {
        subscription = {
          planId: freePack._id,
          status: 'active',
          startDate: new Date(),
          endDate: null // No end for free pack
        };
      }
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role,
      SubRole,
      isActive: isActiveValue, // Correctly set to false for SyndicateCoowner
      country,
      city,
      language: language || 'en', // Default to English if not provided
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpire,
      buildingAssociations: [], // Initialize this array
      ...(subscription ? { subscription } : {})
    });

    // Handle building association and notifications
    if (buildingId && building) {
      if (role === 'SyndicateCoowner') {
        // Add co-owner to building's coOwners array
        building.coOwners.push(user._id);
        await building.save();

        console.log('Added user to building coOwners:', {
          userId: user._id,
          buildingId: building._id
        });

        // IMPORTANT: Create the building-coowner association with isActive set to FALSE
        const BuildingCoownerAssociation = require('../Models/building-coowner');
        const association = await BuildingCoownerAssociation.create({
          building: building._id,
          coOwner: user._id,
          isActive: false, // <-- MAKE SURE THIS IS FALSE - this was the main issue
          joinedAt: new Date(),
          lastStatusChange: new Date()
        });

        // Add the association to the user's buildingAssociations array
        user.buildingAssociations = [association._id];
        await user.save();

        console.log('Created building association:', {
          associationId: association._id,
          isActive: association.isActive
        });
      }

      // Send notification to building admin
      if (building.user) {
        const NotificationController = require('./notificationsController');
        const { socketManager } = require('../Socket/socketManager');

        // Create notification for the building admin
        const notificationTitle = role === 'Worker' ? 'New Worker Registration' : 'New Co-Owner Registration';
        const notificationContent = `${firstName} ${lastName} has registered as a ${role === 'Worker' ? 'maintenance worker' : 'co-owner'} for your building ${building.name}. Please review and approve this request.`;

        // Add association ID to the notification for co-owners
        const notificationData = {
          recipient: building.user,
          type: 'alert',
          title: notificationTitle,
          content: notificationContent,
          relatedTo: user._id,
          onModel: 'coowner',
          senderName: `${firstName} ${lastName}`,
          senderAvatar: user._id || null,
        };

        // Add association ID if this is a co-owner
        if (role === 'SyndicateCoowner' && user.buildingAssociations[0]) {
          notificationData.associationId = user.buildingAssociations[0];
        }

        const notification = await NotificationController.createNotification(notificationData);

        // Send real-time notification if admin is online and notification was created successfully
        if (notification) {
          const adminSocketId = socketManager.onlineUsers.get(building.user.toString());
          if (adminSocketId) {
            socketManager.io.to(adminSocketId).emit('notification', {
              ...notification.toObject(),
              buildingId: building._id,
              buildingName: building.name,
              userType: role === 'Worker' ? 'worker' : 'co-owner',
              actionType: 'registration'
            });
            console.log(`✓ ${role} registration notification sent to admin ${building.user}`);
          }
        } else {
          console.log(`Failed to create notification for ${role} registration`);
        }
      }
    }

    console.log('CLIENT_URL environment variable:', process.env.CLIENT_URL);

    // Then when creating the verify URL
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;
    console.log('Generated verification URL:', verifyUrl);
    await sendVerificationEmail(email, verifyUrl, user.language);
    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive, // Will be false for SyndicateCoowner
        buildingId: buildingId || null,
        country: user.country,
        city: user.city,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      message: 'Invalid user data',
      error: error.message
    });
  }
};



// Helper: generate short-lived temp JWT for 2FA flows
const generateTemp2FaToken = (userId, expiresInSeconds = 600) => {
  // payload marks this token as temporary and for 2fa purpose
  const payload = { id: userId.toString(), temp: true, purpose: '2fa' };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });
};



// ------------------ Updated generateAndSend2FaCode ------------------
// Replaces the previous implementation that used sendVerificationEmail for 2FA
const generateAndSend2FaCode = async (user) => {
  // generate numeric 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // store hashed code and expiry (10 minutes)
  const hash = await bcrypt.hash(code, 10);
  user.twoFATempCodeHash = hash;
  user.twoFATempCodeExpire = Date.now() + 1000 * 60 * 10; // 10 minutes in ms
  user.twoFAMethod = user.twoFAMethod || 'email';
  await user.save();

  // send the numeric code using the dedicated 2FA email template
  await sendTwoFaVerificationEmail(user.email, code, user.language || 'en');

  return true;
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email })
      .populate({
        path: 'subscription.planId',
        populate: {
          path: 'features', // Populate the features field in the Subscription model
        },
      })
      .populate('subscriptionHistory.planId');

    if (!user) {
      return res.status(401).json({ message: 'Account not found' });
    }
    if (user.subscription.status === "inactive") {
      const currentDate = new Date();
      const startDate = new Date(user.subscription.startDate);
      const timeDifference = currentDate - startDate;
      const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
    }
    // Vérification email
    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Email not verified' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account deactivated",
        user: {
          role: user.role,
          isActive: user.isActive,
          // ...other fields you want
        }
      });
    }


    if (user && (await user.matchPassword(password))) {

if (user.twoStepsVerify) {
      // create temp JWT (short lived, e.g., 10 minutes)
      const tempToken = generateTemp2FaToken(user._id, 60 * 10); // 600 seconds

      // generate/send code and save hashed code on user
      try {
        await generateAndSend2FaCode(user);
      } catch (err) {
        console.error('[2FA] send code error', err);
        return res.status(500).json({ message: 'Failed to send 2FA code' });
      }

      // return response telling client to open 2FA modal
      return res.json({
        twoFaRequired: true,
        tempToken // client will include this as Authorization Bearer when verifying/resending
      });
    }
if (!user.acceptedPrivacy || !user.acceptedTerms) {
  // generate temporary token that allows accepting policies
  const tempPolicyToken = generateTempPolicyToken(user._id, 60 * 10); // 10 min
  // respond telling client to display policy-acceptance page
  return res.json({
    mustAcceptPolicies: true,
    tempPolicyToken,
    email: user.email,
    // optionally minimal user info:
    user: { id: user._id, email: user.email, role: user.role }
  });
}
      res.json({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        SubRole: user.SubRole,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
        website: user.website,
        city: user.city,
        country: user.country,
        zipCode: user.zipCode,
        description: user.description,
        isActive: user.isActive,
        fakePassword: user.fakePassword,
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpire: user.resetPasswordExpire,
        googleId: user.googleId,
        facebookId: user.facebookId,
        socials: user.socials,
        authMethod: user.authMethod,
        password: user.password,
        subscription: user.subscription,
        subscriptionHistory: user.subscriptionHistory || [],
        paymentStatus: user.paymentStatus,
        gamification: user.gamification,
        transferStatus: user.transferStatus,
        token: await GenerateToken(user._id),
        twoStepsVerify: !!user.twoStepsVerify,
        twoFAMethod: user.twoFAMethod || 'email'

      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUserGoogle = async (req, res) => {
  let { email, token, role, buildingId } = req.body;

  try {
    // Find the user by email and populate necessary fields
    let user = await User.findOne({ email })
      .populate({
        path: 'subscription.planId',
        populate: {
          path: 'features',
        },
      })
      .populate('subscriptionHistory.planId');

    // For new users
    if (!user) {
      // Validate building exists if provided
      let building;
      if (buildingId) {
        building = await Building.findById(buildingId);
        if (!building) {
          return res.status(400).json({ message: 'Building not found' });
        }
      }

      // Prepare subscription for SyndicateAdmin: assign free pack (price 0)
      let subscription = undefined;
      if (role === 'SyndicateAdmin') {
        const freePack = await Subscription.findOne({ price: 0, status: 'active' });
        if (freePack) {
          subscription = {
            planId: freePack._id,
            status: 'active',
            startDate: new Date(),
            endDate: null // No end for free pack
          };
        }
      }

      // Create new user if they don't exist
      user = await User.create({
        email,
        role,
        isActive: role === "SyndicateCoowner" ? false : true,
        isEmailVerified: true, // Google authenticated users are already verified
        buildingAssociations: [], // Initialize this array
        ...(subscription ? { subscription } : {})
      });


      // If this is a co-owner registration with buildingId, add to building's coOwners
      if (buildingId && role === 'SyndicateCoowner' && building) {
        building.coOwners.push(user._id);
        await building.save();

        // IMPORTANT: Create the building-coowner association
        const BuildingCoownerAssociation = require('../Models/building-coowner');
        const association = await BuildingCoownerAssociation.create({
          building: building._id,
          coOwner: user._id,
          isActive: false, // Set this to false to require admin approval
          joinedAt: new Date(),
          lastStatusChange: new Date()
        });

        // Add the association to the user's buildingAssociations array
        user.buildingAssociations = [association._id];
        await user.save();

        // Send notification to building admin
        if (building.user) {
          const NotificationController = require('./notificationsController');
          const { socketManager } = require('../Socket/socketManager');

          // Create notification for the building admin
          const notificationTitle = 'New Co-Owner Registration';
          const notificationContent = `A new co-owner has registered for your building ${building.name} using Google authentication. Please review and approve this request.`;

          const notification = await NotificationController.createNotification({
            recipient: building.user,
            type: 'alert',
            title: notificationTitle,
            content: notificationContent,
            relatedTo: user._id,
            onModel: 'coowner',
            senderName: user.email, // Using email since we don't have name yet
            associationId: association._id
          });

          // Send real-time notification if admin is online
          const adminSocketId = socketManager.onlineUsers.get(building.user.toString());
          if (adminSocketId) {
            socketManager.io.to(adminSocketId).emit('notification', {
              ...notification.toObject(),
              buildingId: building._id,
              buildingName: building.name,
              userType: 'co-owner',
              actionType: 'registration'
            });
          }
        }
      }
    }
    // For existing users
    else {
      // Update user's role
      user.role = role;
      // If SyndicateAdmin and no subscription, assign free pack
      if (role === 'SyndicateAdmin' && (!user.subscription || !user.subscription.planId)) {
        const freePack = await Subscription.findOne({ price: 0, status: 'active' });
        if (freePack) {
          user.subscription = {
            planId: freePack._id,
            status: 'active',
            startDate: new Date(),
            endDate: null
          };
        }
      }
      // Handle building association only for co-owners
      if (buildingId && role === "SyndicateCoowner") {
        // Validate building exists
        const building = await Building.findById(buildingId);
        if (!building) {
          return res.status(400).json({ message: 'Building not found' });
        }

        // Add user to building's coOwners if not already present
        if (!building.coOwners.includes(user._id)) {
          building.coOwners.push(user._id);
          await building.save();

          // Check if association already exists
          const BuildingCoownerAssociation = require('../Models/building-coowner');
          const existingAssociation = await BuildingCoownerAssociation.findOne({
            building: building._id,
            coOwner: user._id
          });

          // Create association if it doesn't exist
          if (!existingAssociation) {
            const association = await BuildingCoownerAssociation.create({
              building: building._id,
              coOwner: user._id,
              isActive: true, // Inactive by default, waiting for admin approval
              joinedAt: new Date(),
              lastStatusChange: new Date()
            });

            // Initialize buildingAssociations array if it doesn't exist
            if (!user.buildingAssociations) {
              user.buildingAssociations = [];
            }

            // Add the association to the user's buildingAssociations array
            user.buildingAssociations.push(association._id);
          }
        }
      }

      if (role === "SyndicateCoowner") {
        user.isActive = false;
      }

      await user.save();
    }

        // If user uses Google and has 2FA enabled -> start 2FA flow
    if (user.twoStepsVerify) {
      const tempToken = generateTemp2FaToken(user._id, 60 * 10); // 10 minutes
      try {
        await generateAndSend2FaCode(user);
      } catch (err) {
        console.error('[2FA] send code (google) error', err);
        return res.status(500).json({ message: 'Failed to send 2FA code' });
      }
      return res.json({ twoFaRequired: true, tempToken });
    }


    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      SubRole: user.SubRole,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber,
      website: user.website,
      city: user.city,
      country: user.country,
      zipCode: user.zipCode,
      description: user.description,
      isActive: user.isActive,
      fakePassword: user.fakePassword,
      resetPasswordToken: user.resetPasswordToken,
      resetPasswordExpire: user.resetPasswordExpire,
      googleId: user.googleId,
      facebookId: user.facebookId,
      socials: user.socials,
      authMethod: user.authMethod,
      password: user.password,
      subscription: user.subscription,
      subscriptionHistory: user.subscriptionHistory || [],
      paymentStatus: user.paymentStatus,
      gamification: user.gamification,
      token: await GenerateToken(user._id),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({ message: "Account Error" });
  }
};

const resendLoginTwoFa = async (req, res) => {
  try {
    // get temp token from Authorization header
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Missing temp token' });

    // decode temp token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Temp token invalid or expired' });
    }

    if (!decoded || !decoded.id || !decoded.temp || decoded.purpose !== '2fa') {
      return res.status(401).json({ message: 'Invalid temp token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await generateAndSend2FaCode(user);
    return res.json({ message: '2FA code resent', expiresInSeconds: 600 });
  } catch (err) {
    console.error('[2FA] resend error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Use numeric expiry (ms) approach
const loginVerifyTwoFa = async (req, res) => {
  try {
    // get temp token from x-temp-token OR Authorization
    let token = null;
    if (req.headers['x-temp-token']) {
      token = req.headers['x-temp-token'];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Missing temp token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[2FA] temp token decoded:', decoded);
    } catch (err) {
      console.error('[2FA] temp token validation failed:', err.message);
      return res.status(401).json({ message: 'Temp token invalid or expired' });
    }

    if (!decoded || !decoded.id || !decoded.temp || decoded.purpose !== '2fa') {
      return res.status(401).json({ message: 'Invalid temp token' });
    }

    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('[2FA] user fields before verify:', {
      twoFATempCodeHash: !!user.twoFATempCodeHash,
      twoFATempCodeExpire: user.twoFATempCodeExpire
    });

    if (!user.twoFATempCodeHash || !user.twoFATempCodeExpire) {
      return res.status(400).json({ message: 'No 2FA code pending verification' });
    }

    // if you stored expiry as Number (ms)
    if (Date.now() > user.twoFATempCodeExpire) {
      user.twoFATempCodeHash = undefined;
      user.twoFATempCodeExpire = undefined;
      await user.save();
      return res.status(400).json({ message: '2FA code expired' });
    }

    const match = await bcrypt.compare(code.toString(), user.twoFATempCodeHash);
    if (!match) return res.status(400).json({ message: 'Invalid code' });

    // success -> clear and issue final token
    user.twoFATempCodeHash = undefined;
    user.twoFATempCodeExpire = undefined;
    await user.save();

    const authToken = await GenerateToken(user._id);
    return res.json({
      token: authToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    console.error('[2FA] verify login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /auth/accept-policies
const acceptPolicies = async (req, res) => {
  try {
    // temp token can be in header x-temp-token or Authorization Bearer
    let token = null;
    if (req.headers['x-temp-token']) token = req.headers['x-temp-token'];
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Missing temp token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Temp token invalid or expired' });
    }

    if (!decoded || !decoded.id || !decoded.temp || decoded.purpose !== 'policy') {
      return res.status(401).json({ message: 'Invalid temp token' });
    }

    const { marketingOptIn = false } = req.body;

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Mark required consents as accepted
    user.acceptedTerms = true;
    user.acceptedPrivacy = true; // required
    user.marketingOptIn = !!marketingOptIn;
    await user.save();

    // Issue final auth token
    const authToken = await GenerateToken(user._id);

    return res.json({
      token: authToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        marketingOptIn: user.marketingOptIn
      }
    });
  } catch (err) {
    console.error('acceptPolicies error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { 
  registerUser,
  loginUser,
  loginUserGoogle,
  verifyEmail,
  resendVerificationEmail,
  resendLoginTwoFa,
  loginVerifyTwoFa,
  acceptPolicies

 };
