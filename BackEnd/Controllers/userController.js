const User = require('../Models/User');
const { sendWelcomeEmail, sendToggleUserEmail, sendWelcomeEmailForCoowners, sendToggleUserDeactivateEmail, sendNewAssignmentEmail, sendTransferConfirmationEmail, sendTransferConfirmationNotificationEmail, sendAccountTransferEmail } = require('../Utils/Email');
const generatePassword = require('generate-password');
const crypto = require('crypto');
const { default: mongoose } = require('mongoose');
const jwt = require('jsonwebtoken');
const NotificationController = require('./notificationsController');


const Building = require('../Models/Building');
const Apartment = require('../Models/Appartement');

const Bloc = require('../Models/Bloc');
const BuildingCoownerAssociation = require('../Models/building-coowner');

// Helper function to get user language from database
const getUserLanguage = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user?.language || 'en';
  } catch (error) {
    console.log('Error getting user language:', error);
    return 'en'; // Default fallback
  }
};

// Notification templates for multiple languages
const notificationTemplates = {
  transferInitiated: {
    en: {
      title: 'Account Transfer Initiated',
      content: 'You have initiated an account transfer to {newEmail}. A confirmation email has been sent.'
    },
    fr: {
      title: 'Transfert de compte initié',
      content: 'Vous avez initié un transfert de compte vers {newEmail}. Un email de confirmation a été envoyé.'
    },
    it: {
      title: 'Trasferimento account avviato',
      content: 'Hai avviato un trasferimento di account a {newEmail}. È stata inviata un\'email di conferma.'
    },
    sp: {
      title: 'Transferencia de cuenta iniciada',
      content: 'Ha iniciado una transferencia de cuenta a {newEmail}. Se ha enviado un correo electrónico de confirmación.'
    }
  },
  transferConfirmed: {
    en: {
      title: 'Account Transfer Confirmed',
      content: 'The new email address {newEmail} has confirmed the transfer request. Please finalize the transfer in settings.'
    },
    fr: {
      title: 'Transfert de compte confirmé',
      content: 'La nouvelle adresse e-mail {newEmail} a confirmé la demande de transfert. Veuillez finaliser le transfert dans les paramètres.'
    },
    it: {
      title: 'Trasferimento account confermato',
      content: 'Il nuovo indirizzo email {newEmail} ha confermato la richiesta di trasferimento. Completa il trasferimento nelle impostazioni.'
    },
    sp: {
      title: 'Transferencia de cuenta confirmada',
      content: 'La nueva dirección de correo electrónico {newEmail} ha confirmado la solicitud de transferencia. Finalice la transferencia en la configuración.'
    }
  },
  transferFinalized: {
    en: {
      title: 'Account Transfer Completed',
      content: 'Your account has been successfully transferred from {oldEmail} to {newEmail}. New login credentials have been sent to {newEmail}.'
    },
    fr: {
      title: 'Transfert de compte terminé',
      content: 'Votre compte a été transféré avec succès de {oldEmail} à {newEmail}. Les nouvelles informations de connexion ont été envoyées à {newEmail}.'
    },
    it: {
      title: 'Trasferimento account completato',
      content: 'Il tuo account è stato trasferito con successo da {oldEmail} a {newEmail}. Le nuove credenziali di accesso sono state inviate a {newEmail}.'
    },
    sp: {
      title: 'Transferencia de cuenta completada',
      content: 'Su cuenta se ha transferido correctamente de {oldEmail} a {newEmail}. Se han enviado nuevas credenciales de inicio de sesión a {newEmail}.'
    }
  },
  transferCancelled: {
    en: {
      title: 'Account Transfer Cancelled',
      content: 'The account transfer process has been cancelled. Your account remains unchanged.'
    },
    fr: {
      title: 'Transfert de compte annulé',
      content: 'Le processus de transfert de compte a été annulé. Votre compte reste inchangé.'
    },
    it: {
      title: 'Trasferimento account annullato',
      content: 'Il processo di trasferimento dell\'account è stato annullato. Il tuo account rimane invariato.'
    },
    sp: {
      title: 'Transferencia de cuenta cancelada',
      content: 'El proceso de transferencia de cuenta ha sido cancelado. Su cuenta permanece sin cambios.'
    }
  }
};

// Helper function to get localized notification content
const getLocalizedNotification = (templateKey, language, variables = {}) => {
  const template = notificationTemplates[templateKey][language] || notificationTemplates[templateKey].en;
  
  let title = template.title;
  let content = template.content;
  
  // Replace variables in title and content
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
    content = content.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return { title, content };
};


// Get logged-in user profile
const getConnectedUser = async (req, res) => {
  res.status(200).json(req.user);
};
// Update or add this function
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Find user and populate necessary fields
    const user = await User.findById(id)
      .populate({
        path: 'apartments',
        populate: {
          path: 'building',
          select: 'name'
        }
      })
      .populate({
        path: 'delegates.user',
        select: 'firstName lastName email avatar role'
      })
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message
    });
  }
};
// Get all users (SuperAdmin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const filteredUsers = users.filter(user => user.role !== "SuperAdmin");
    res.status(200).json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
// Get all users (SuperAdmin only)
const getAllCoowners = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const filteredUsers = users.filter(user => user.role === "SyndicateCoowner");
    res.status(200).json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
const getAllUsersforcontract = async (req, res) => {
  try {
    const users = await User.find({ role: "SyndicateAdmin" }).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// Create new user (SuperAdmin only)
const createUser = async (req, res) => {
  const { firstName, lastName, email, password, role, SubRole } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      SubRole
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      role: user.role,
      SubRole: user.SubRole,
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find the user first to ensure we preserve sensitive fields
    const existingUser = await User.findById(userId);
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // List of fields we don't want to update through this endpoint
    const protectedFields = [
      'subscription', 
      'subscriptionHistory', 
      'password', 
      'role', 
      'isActive', 
      'resetPasswordToken', 
      'resetPasswordExpire',
      'transferStatus',
      'transferConfirmationToken',
      'transferConfirmationExpire',
      'pendingTransferEmail'
    ];

    // Create a sanitized update object without protected fields
    const updateData = { ...req.body };
    protectedFields.forEach(field => {
      delete updateData[field];
    });

    // Update only non-protected fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      SubRole: updatedUser.SubRole,
      phoneNumber: updatedUser.phoneNumber,
      website: updatedUser.website,
      city: updatedUser.city,
      country: updatedUser.country,
      zipCode: updatedUser.zipCode,
      description: updatedUser.description,
      buildings: updatedUser.buildings,
      isActive: updatedUser.isActive,
      resetPasswordToken: updatedUser.resetPasswordToken,
      resetPasswordExpire: updatedUser.resetPasswordExpire,
      googleId: updatedUser.googleId,
      facebookId: updatedUser.facebookId,
      authMethod: updatedUser.authMethod,
      subscription: updatedUser.subscription,
      socials: updatedUser.socials,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



// Delete user (SuperAdmin only)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id; // Ensure you're using "id" from req.params

    // Check if the ID is valid before querying the database
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use deleteOne instead of remove (since remove() is deprecated)
    await User.deleteOne({ _id: userId });

    console.log("User deleted successfully:", userId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};


//SuperAdmin Create  Admin accounts
const S_AdmincreateUser = async (req, res) => {
  const { firstName, lastName, email, role, SubRole } = req.body;

  try {
    // 1. Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Generate random password with guaranteed complexity
    const generateSecurePassword = () => {
      // Generate a password with strict requirements
      const password = generatePassword.generate({
        length: 16, // Increased length to ensure minimum length even with exclusions
        numbers: true,
        uppercase: true,
        lowercase: true, // Adding lowercase explicitly
        symbols: true,
        strict: true,
        exclude: `'"\\` // Exclude problematic characters
      });
      
      // Verify the password meets our requirements
      const hasNumber = /[0-9]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);
      
      // If the password is too short or missing any required character type, generate a new one
      if (password.length < 12 || !hasNumber || !hasUpper || !hasLower || !hasSymbol) {
        return generateSecurePassword(); // Recursively try again
      }
      
      return password;
    };
    
    const password = generateSecurePassword();

    // 3. Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook
      role,
      SubRole,
      isActive: true,
      isEmailVerified: true
    });
    //create reset url
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save().catch(err => console.error("Error saving user:", err));

    const resetUrl = `${process.env.CLIENT_URL}/auth-pass-change-basic/${resetToken}`;
    // 4. Send welcome email (fire-and-forget)
    sendWelcomeEmail(email, password, resetUrl, user.language || 'en');

    // 5. Respond without sensitive data
    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      message: 'User created successfully. Welcome email sent.'
    });

  } catch (error) {
    res.status(400).json({
      message: 'User creation failed',
      error: error.message
    });
  }
};


const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Send email notification if user is being activated
    if (user.isActive) {
      await sendToggleUserEmail(user.email, user.firstName, user.lastName, user.language);
    }
    else if (user.isActive == false) {
      await sendToggleUserDeactivateEmail(user.email, user.firstName, user.lastName);
    }

    res.status(200).json({
      _id: user._id,
      isActive: user.isActive
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    // Validation
    if (!(await user.matchPassword(oldPassword))) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'passwords do not match' });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.fakePassword = null; // Clear fakePassword
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const createCoowner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      firstName,
      lastName,
      email,
      buildingId,
      blocIds,
      apartmentIds,
      userId // For existing user mode
    } = req.body;

    // Validate required arrays
    if (!Array.isArray(blocIds) || blocIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'At least one bloc must be selected' });
    }

    if (!Array.isArray(apartmentIds) || apartmentIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'At least one apartment must be selected' });
    }

    // 1. First check if email is already a co-owner in this building
    const building = await Building.findById(buildingId)
      .populate({
        path: 'coOwners',
        select: 'email'
      })
      .session(session);

    if (!building) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Building not found' });
    }

    // For new user mode, check if email already exists as co-owner
    if (!userId) {
      const isExistingCoowner = building.coOwners.some(coowner =>
        coowner.email.toLowerCase() === email.toLowerCase()
      );

      if (isExistingCoowner) {
        await session.abortTransaction();
        return res.status(400).json({
          message: 'This email is already registered as a co-owner in this building',
          existingCoowner: email
        });
      }
    }

    // 2. Validate all apartments exist and check for conflicts
    const apartments = await Apartment.find({ 
      _id: { $in: apartmentIds },
      building: buildingId 
    })
      .populate('coOwner')
      .session(session);

    if (apartments.length !== apartmentIds.length) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Some apartments not found or don\'t belong to this building' });
    }

    // Check if any apartment has existing co-owner (for new assignments)
    const conflictingApartments = apartments.filter(apt => 
      apt.coOwner && (!userId || apt.coOwner._id.toString() !== userId)
    );

    if (conflictingApartments.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Some apartments are already assigned to other co-owners',
        conflictingApartments: conflictingApartments.map(apt => ({
          apartmentId: apt._id,
          apartmentNumber: apt.number,
          currentOwner: apt.coOwner.email
        }))
      });
    }

    // 3. Find or create user
    let user;
    let temporaryPassword = null;
    let isNewUser = false;

    if (userId) {
      // Existing user mode
      user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Selected user not found' });
      }
    } else {
      // New user mode - find or create
      user = await User.findOne({ email }).session(session);
      
      if (!user) {
        temporaryPassword = crypto.randomBytes(4).toString('hex');
        user = await User.create([{
          firstName,
          lastName,
          email,
          password: temporaryPassword,
          role: 'SyndicateCoowner',
          blocs: blocIds,
          apartments: apartmentIds,
          buildings: [buildingId],
          isActive: true,
          isEmailVerified: true
        }], { session });
        user = user[0];
        isNewUser = true;
      } else {
        // Update existing user associations
        await User.findByIdAndUpdate(
          user._id,
          {
            $addToSet: {
              blocs: { $each: blocIds },
              apartments: { $each: apartmentIds },
              buildings: buildingId
            }
          },
          { session }
        );
      }
    }

    // 4. Create BuildingCoownerAssociation - NEW PART
    const existingAssociation = await BuildingCoownerAssociation.findOne({
      building: buildingId,
      coOwner: user._id
    }).session(session);

    if (!existingAssociation) {
      // Create new association with active status
      const newAssociation = await BuildingCoownerAssociation.create([{
        building: buildingId,
        coOwner: user._id,
        isActive: true, // Directly active when created through the admin interface
        activatedBy: req.user._id, // The admin who created it
        activatedAt: new Date(),
        joinedAt: new Date(),
        apartments: apartmentIds
      }], { session });

      // Add association to user's buildingAssociations
      await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { buildingAssociations: newAssociation[0]._id } },
        { session }
      );
    } else {
      // Update existing association
      existingAssociation.isActive = true;
      existingAssociation.apartments = [
        ...new Set([...existingAssociation.apartments, ...apartmentIds].map(id => id.toString()))
      ];
      existingAssociation.lastStatusChange = new Date();
      await existingAssociation.save({ session });
    }

    // 5. Update all apartments with the co-owner
    await Apartment.updateMany(
      { _id: { $in: apartmentIds } },
      { 
        coOwner: user._id,
        building: buildingId
      },
      { session }
    );

    // 6. Update building and blocs associations
    await Building.findByIdAndUpdate(
      buildingId,
      { $addToSet: { coOwners: user._id } },
      { session }
    );

    await Bloc.updateMany(
      { _id: { $in: blocIds } },
      { $addToSet: { coOwners: user._id } },
      { session }
    );

    // Commit transaction if all operations succeeded
    await session.commitTransaction();

    // Get apartment and bloc details for email notification
    const firstApartment = apartments[0];
    const firstBloc = await Bloc.findById(blocIds[0]);
    const loginToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const loginUrl = `${process.env.CLIENT_URL}/directLogin?token=${loginToken}`;

    // Send email notification
    if (isNewUser) {
      await sendWelcomeEmailForCoowners(
        email,
        temporaryPassword,
        loginUrl,
        building.matricule,
        firstBloc.name,
        building.name,
        firstApartment.number,
        firstApartment.floor,
        user.language || 'en'
      );
    } else {
      await sendNewAssignmentEmail(
        email,
        building.name,
        firstBloc.name,
        `${firstApartment.number}${apartmentIds.length > 1 ? ` (+${apartmentIds.length - 1} more)` : ''}`,
        firstApartment.floor,
        loginUrl,
        user.language || 'en'
      );
    }

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      assignments: {
        building: buildingId,
        blocs: blocIds,
        apartments: apartmentIds,
        totalApartments: apartmentIds.length
      },
      isNewUser
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating coowner:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create coowner'
    });
  } finally {
    session.endSession();
  }
};

// Delete own account
const deleteOwnAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // Get the user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Delete user account
    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete account'
    });
  }
};

// Transfer syndic account to new email
const transferSyndicAccount = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'New email and password are required'
      });
    }

    // Check if user exists and is SyndicateAdmin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'SyndicateAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Only syndicate admins can transfer their accounts'
      });
    }

    // Verify password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email address already exists'
      });
    }

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiry (30 minutes)
    user.transferConfirmationToken = crypto
      .createHash('sha256')
      .update(confirmationToken)
      .digest('hex');
    user.transferConfirmationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    user.pendingTransferEmail = newEmail;
    user.transferStatus = 'pending_email_confirmation';
    
    await user.save();

    // Create confirmation URL
    const confirmUrl = `${process.env.CLIENT_URL}/confirm-transfer/${confirmationToken}`;

    // Send confirmation email to new email
    try {
      await sendTransferConfirmationEmail(
        newEmail,
        user.email, // Show current email in the email
        confirmUrl,
        user.firstName,
        user.lastName,
        user.language || 'en'
      );
      
      // Get user's language preference
      const userLanguage = await getUserLanguage(userId);
      
      // Get localized notification content
      const notificationData = getLocalizedNotification('transferInitiated', userLanguage, {
        newEmail: newEmail
      });
      
      // Create notification for the user
      await NotificationController.createNotification({
        recipient: userId,
        type: 'info',
        title: notificationData.title,
        content: notificationData.content,
        onModel: 'User',
        relatedTo: userId
      });
      
    } catch (emailError) {
      console.error('Error sending transfer confirmation:', emailError);
      
      // Reset transfer status if email fails
      user.transferConfirmationToken = undefined;
      user.transferConfirmationExpire = undefined;
      user.pendingTransferEmail = undefined;
      user.transferStatus = 'none';
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send confirmation email. Please try again.'
      });
    }

    console.log(`Transfer confirmation sent for ${user.email} to ${newEmail}`);

    res.status(200).json({
      success: true,
      message: 'Confirmation email sent to the new email address. The recipient must click the confirmation link to complete the transfer.',
      data: {
        currentEmail: user.email,
        newEmail,
        expiresIn: '30 minutes'
      }
    });

  } catch (error) {
    console.error('Error initiating transfer:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate transfer'
    });
  }
};

// Confirm transfer account
const confirmTransferSyndicAccount = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Transfer confirmation token is required'
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      transferConfirmationToken: hashedToken,
      transferConfirmationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired confirmation token'
      });
    }

    // Update status to pending final approval
    user.transferStatus = 'pending_final_approval';
    user.transferConfirmationToken = undefined; // Invalidate the token
    user.transferConfirmationExpire = undefined; // Clear expiry

    await user.save();
    
    // Get user's language preference
    const userLanguage = await getUserLanguage(user._id);
      
    // Get localized notification content
    const notificationData = getLocalizedNotification('transferConfirmed', userLanguage, {
      newEmail: user.pendingTransferEmail
    });
      
    // Create notification for the user
    await NotificationController.createNotification({
      recipient: user._id,
      type: 'info',
      title: notificationData.title,
      content: notificationData.content,
      onModel: 'User',
      relatedTo: user._id
    });

    // Send email to original user notifying them of the pending approval
    try {
      await sendTransferConfirmationNotificationEmail(
        user.email,                  // original email
        user.pendingTransferEmail,   // new email that confirmed
        user.firstName,
        user.lastName,
        user.language || 'en'
      );
    } catch (emailError) {
      console.error('Failed to send transfer confirmation notification:', emailError);
      // Continue with the process even if the email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email confirmed. Please return to your settings to finalize the transfer.'
    });

  } catch (error) {
    console.error('Error confirming transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm transfer'
    });
  }
};

const finalizeTransferSyndicAccount = async (req, res) => {
  try {
    const userId = req.user.id; // From authenticated user

    const user = await User.findById(userId);

    if (!user || user.transferStatus !== 'pending_final_approval' || !user.pendingTransferEmail) {
      return res.status(400).json({
        success: false,
        message: 'No transfer pending approval or invalid state.'
      });
    }

    // Check if pending transfer email still doesn't exist
    const existingUser = await User.findOne({ email: user.pendingTransferEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      user.transferStatus = 'failed';
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Email address is no longer available'
      });
    }

    // Store old email for logging and email
    const oldEmail = user.email;
    const newEmail = user.pendingTransferEmail;
    const firstName = user.firstName;
    const lastName = user.lastName;
    const userLanguage = user.language || 'en';

    // Generate new password with guaranteed minimum length and complexity
    const generateSecurePassword = () => {
      // Generate a password with strict requirements
      const password = generatePassword.generate({
        length: 16, // Increased from 12 to ensure minimum length even with exclusions
        numbers: true,
        uppercase: true,
        lowercase: true,
        symbols: true,
        strict: true,
        exclude: `'"\\`
      });
      
      // Verify the password meets our requirements
      const hasNumber = /[0-9]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);
      
      // If the password is too short or missing any required character type, generate a new one
      if (password.length < 12 || !hasNumber || !hasUpper || !hasLower || !hasSymbol) {
        return generateSecurePassword(); // Recursively try again
      }
      
      return password;
    };
    
    const newPassword = generateSecurePassword();

    // Update user email and password
    user.email = newEmail;
    user.password = newPassword; // This will be hashed by the pre-save middleware
    
    // Clear transfer confirmation fields
    user.transferConfirmationToken = undefined;
    user.transferConfirmationExpire = undefined;
    user.pendingTransferEmail = undefined;
    user.transferStatus = 'none';
    
    await user.save();
    
    // Get localized notification content
    const notificationData = getLocalizedNotification('transferFinalized', userLanguage, {
      oldEmail: oldEmail,
      newEmail: newEmail
    });
      
    // Create notification for the user
    await NotificationController.createNotification({
      recipient: userId,
      type: 'success',
      title: notificationData.title,
      content: notificationData.content,
      onModel: 'User',
      relatedTo: userId
    });

    // Send account transfer notification email to new email
    try {
      await sendAccountTransferEmail(
        oldEmail,
        newEmail,
        newPassword,
        firstName,
        lastName,
        userLanguage
      );
    } catch (emailError) {
      console.error('Failed to send transfer notification email:', emailError);
      // Don't fail the transfer if email fails, but log it
    }

    res.status(200).json({
      success: true,
      message: 'Account transfer completed successfully. The new credentials have been sent to the new email address.'
    });

  } catch (error) {
    console.error('Error finalizing transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to finalize transfer'
    });
  }
};

const cancelTransferSyndicAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.transferStatus !== 'pending_email_confirmation' && user.transferStatus !== 'pending_final_approval') {
      return res.status(400).json({ success: false, message: 'No active transfer process to cancel.' });
    }
    
    // Store the pending email before clearing it (for notification)
    const pendingEmail = user.pendingTransferEmail;

    user.transferStatus = 'failed'; // Or 'none'
    user.pendingTransferEmail = undefined;
    user.transferConfirmationToken = undefined;
    user.transferConfirmationExpire = undefined;

    await user.save();
    
    // Get user's language preference
    const userLanguage = user.language || 'en';
      
    // Get localized notification content
    const notificationData = getLocalizedNotification('transferCancelled', userLanguage, {});
      
    // Create notification for the user
    await NotificationController.createNotification({
      recipient: userId,
      type: 'info',
      title: notificationData.title,
      content: notificationData.content,
      onModel: 'User',
      relatedTo: userId
    });

    // Return the updated user object so the frontend can update its state
    const updatedUser = await User.findById(userId).populate({
        path: 'subscription.planId',
        populate: {
          path: 'features',
        },
      }).populate('subscriptionHistory.planId');

    res.status(200).json({
      success: true,
      message: 'Account transfer has been successfully cancelled.',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error cancelling transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transfer.'
    });
  }
};

module.exports = {
  toggleUserStatus,
  changePassword,
  getConnectedUser,
  getAllUsers,
  createUser,
  updateUser,
  getUserById,
  deleteUser,
  getAllCoowners,
  createCoowner,
  getAllUsersforcontract,
  S_AdmincreateUser,
  deleteOwnAccount,
  transferSyndicAccount,
  confirmTransferSyndicAccount,
  finalizeTransferSyndicAccount,
  cancelTransferSyndicAccount
};