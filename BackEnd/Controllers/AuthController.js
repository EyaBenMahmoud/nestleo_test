const User = require('../Models/User');
const { GenerateToken } = require('../Utils/GenrateToken');
const Building = require('../Models/Building');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../Utils/Email');
const axios = require('axios');

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
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    role,
    SubRole,
    buildingId,
    country,
    city,
    language,
    recaptchaToken: recaptchaTokenFromBody,
    recaptcha: recaptchaAlternate, // accept either name
    recaptchaAction: expectedRecaptchaAction // optional field if using reCAPTCHA v3 action matching
  } = req.body;

  const recaptchaToken = recaptchaTokenFromBody || recaptchaAlternate || null;
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';

  try {
    // 1) Verify reCAPTCHA if secret is provided. If secret missing, log a warning and proceed (optional).
    if (!RECAPTCHA_SECRET) {
      console.warn('RECAPTCHA secret key not set (process.env.RECAPTCHA_SECRET_KEY). Skipping verification.');
    } else {
      if (!recaptchaToken) {
        return res.status(400).json({ message: 'reCAPTCHA token missing' });
      }

      // Google's siteverify endpoint expects either form-encoded or query params.
      // We'll use axios to POST as URLSearchParams for compatibility.
      const params = new URLSearchParams();
      params.append('secret', RECAPTCHA_SECRET);
      params.append('response', recaptchaToken);
      // optionally include remoteip
      if (req.ip) params.append('remoteip', req.ip);

      const verifyRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000
      });

      const verification = verifyRes.data;

      // Basic success check
      if (!verification || verification.success !== true) {
        console.warn('reCAPTCHA verification failed:', verification);
        return res.status(400).json({ message: 'reCAPTCHA verification failed' });
      }

      // If using reCAPTCHA v3, there's a score field (0.0 - 1.0). You may want a threshold:
      const RECAPTCHA_SCORE_THRESHOLD = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
      if (typeof verification.score !== 'undefined') {
        // Optional: check action name matches (if you passed action from frontend)
        if (expectedRecaptchaAction && verification.action && expectedRecaptchaAction !== verification.action) {
          console.warn('reCAPTCHA action mismatch:', { expected: expectedRecaptchaAction, got: verification.action });
          return res.status(400).json({ message: 'reCAPTCHA action mismatch' });
        }
        if (verification.score < RECAPTCHA_SCORE_THRESHOLD) {
          console.warn('reCAPTCHA score too low:', verification.score);
          return res.status(400).json({ message: 'reCAPTCHA score too low' });
        }
      }
      // For v2 checkbox (no score), success:true is enough.
    }

    // 2) Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 3) Validate building if provided
    let building;
    if (buildingId) {
      building = await Building.findById(buildingId);
      if (!building) {
        return res.status(400).json({ message: 'Building not found' });
      }
    }

    // 4) Prepare flags / subscription etc.
    const isActiveValue = role === 'SyndicateCoowner' ? false : true;

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpire = Date.now() + 1000 * 60 * 60 * 24; // 24h

    let subscription = undefined;
    if (role === 'SyndicateAdmin') {
      const freePack = await Subscription.findOne({ price: 0, status: 'active' });
      if (freePack) {
        subscription = {
          planId: freePack._id,
          status: 'active',
          startDate: new Date(),
          endDate: null
        };
      }
    }

    // 5) Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role,
      SubRole,
      isActive: isActiveValue,
      country,
      city,
      language: language || 'en',
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpire,
      buildingAssociations: [],
      ...(subscription ? { subscription } : {})
    });

    // 6) Building association for coowners
    if (buildingId && building) {
      if (role === 'SyndicateCoowner') {
        building.coOwners.push(user._id);
        await building.save();

        const association = await BuildingCoownerAssociation.create({
          building: building._id,
          coOwner: user._id,
          isActive: true,
          joinedAt: new Date(),
          lastStatusChange: new Date()
        });

        user.buildingAssociations = [association._id];
        await user.save();
      }

      // 7) Notification to building admin (if present)
      if (building.user) {
        const notificationTitle = role === 'Worker' ? 'New Worker Registration' : 'New Co-Owner Registration';
        const notificationContent = `${firstName} ${lastName} has registered as a ${role === 'Worker' ? 'maintenance worker' : 'co-owner'} for your building ${building.name}. Please review and approve this request.`;

        const notification = await NotificationController.createNotification({
          recipient: building.user,
          type: 'alert',
          title: notificationTitle,
          content: notificationContent,
          relatedTo: user._id,
          onModel: 'coowner',
          senderName: `${firstName} ${lastName}`,
          senderAvatar: user._id || null,
          associationId: role === 'SyndicateCoowner' ? user.buildingAssociations[0] : undefined
        });

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

    // 8) Send verification email and respond
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;
    try {
      await sendVerificationEmail(email, verifyUrl, user.language);
    } catch (e) {
      console.warn('Failed to send verification email:', e);
      // Not fatal for registration; continue
    }

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        buildingId: buildingId || null,
        country: user.country,
        city: user.city
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({
      message: 'Invalid user data',
      error: error?.message || String(error)
    });
  }
};
// add this near the top of the file (same module)
const mask = (s = '') =>
  (typeof s === 'string' && s.length > 8) ? `${s.slice(0,8)}...${s.slice(-4)}` : s;

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Accept token from multiple common locations
  const recaptchaToken = req.body?.recaptchaToken || req.body?.recaptcha || req.headers['x-recaptcha-token'] || null;
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';

  try {
    // LOG: incoming request summary
    console.log('[login] incoming request - url:', req.originalUrl, 'method:', req.method);
    console.log('[login] body keys:', Object.keys(req.body));
    console.log('[login] headers sample: x-recaptcha-token present?', !!req.headers['x-recaptcha-token']);
    console.log('[login] remote ip:', req.ip);
  let verification;
    // --- recaptcha verification (if secret provided)
    if (RECAPTCHA_SECRET) {
      // Log secret presence (not the value)
      console.log('[login] RECAPTCHA_SECRET_KEY configured on server:', true);

      if (!recaptchaToken) {
        console.warn('[login] reCAPTCHA token missing in request body/headers');
        return res.status(400).json({ message: 'reCAPTCHA token missing', recaptchaVerified: false });
      }

      // masked log for debugging (never log secrets)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[login] received recaptcha token (masked):', mask(recaptchaToken));
      } else {
        console.log('[login] received recaptcha token (present)');
      }

      // verify with Google
      const params = new URLSearchParams();
      params.append('secret', RECAPTCHA_SECRET);
      params.append('response', recaptchaToken);
      if (req.ip) params.append('remoteip', req.ip);

      let verifyRes;
      try {
        verifyRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          // timeout: 7000
        });
      } catch (err) {
        console.error('[login] reCAPTCHA verification request error:', err.message || err);
        // If Google returned response data, log it (non-prod)
        if (err.response && process.env.NODE_ENV !== 'production') {
          console.error('[login] google siteverify response data:', err.response.data);
        }
        return res.status(400).json({ message: 'reCAPTCHA verification error: network or service unreachable', recaptchaVerified: false, details: (process.env.NODE_ENV !== 'production' ? (err.response?.data || err.message) : undefined) });
      }

      const verification = verifyRes?.data;
      console.log('[login] google siteverify response:', (process.env.NODE_ENV !== 'production') ? verification : { success: verification?.success, score: verification?.score });

      if (!verification || verification.success !== true) {
        console.warn('[login] reCAPTCHA verification failed:', verification);
        return res.status(400).json({
          message: 'reCAPTCHA verification failed',
          recaptchaVerified: false,
          details: (process.env.NODE_ENV !== 'production' ? verification : undefined)
        });
      }

      // v3 score check (if present)
      const RECAPTCHA_SCORE_THRESHOLD = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
      if (typeof verification.score !== 'undefined') {
        console.log('[login] reCAPTCHA score:', verification.score, 'threshold:', RECAPTCHA_SCORE_THRESHOLD);
        if (verification.score < RECAPTCHA_SCORE_THRESHOLD) {
          console.warn('[login] reCAPTCHA score too low:', verification.score);
          return res.status(400).json({
            message: 'reCAPTCHA score too low',
            recaptchaVerified: false,
            details: (process.env.NODE_ENV !== 'production' ? { score: verification.score } : undefined)
          });
        }
      }

      // success -> proceed
      console.log('[login] reCAPTCHA verified successfully.');
    } else {
      console.warn('[login] RECAPTCHA_SECRET_KEY not set; skipping server-side recaptcha verification.');
    }

    // --- authenticate user
    const user = await User.findOne({ email })
      .populate({ path: 'subscription.planId', populate: { path: 'features' } })
      .populate('subscriptionHistory.planId');

    if (!user) {
      return res.status(401).json({ message: 'Account not found', recaptchaVerified: true });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Email not verified', recaptchaVerified: true });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account deactivated",
        user: { role: user.role, isActive: user.isActive },
        recaptchaVerified: true
      });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password', recaptchaVerified: true });
    }

    // build response (omit sensitive fields)
    const token = await GenerateToken(user._id);
    return res.json({
      id: user._id,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        SubRole: user.SubRole,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
        city: user.city,
        country: user.country,
        isActive: user.isActive,
        subscription: user.subscription,
        subscriptionHistory: user.subscriptionHistory || []
      },
      token,
      recaptchaVerified: true,
      recaptchaDetails: (process.env.NODE_ENV !== 'production' ? verification : undefined)
    });
  } catch (error) {
    console.error('[login] unexpected error:', error?.message || error);
    return res.status(500).json({ message: 'Server error', recaptchaVerified: false });
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
          isActive: false, // Inactive by default, waiting for admin approval
          joinedAt: new Date(),
          lastStatusChange: new Date()
        });

        // Add the association to the user's buildingAssociations array
        user.buildingAssociations = [association._id];
        await user.save();
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

module.exports = { registerUser, loginUser, loginUserGoogle, verifyEmail, resendVerificationEmail };
