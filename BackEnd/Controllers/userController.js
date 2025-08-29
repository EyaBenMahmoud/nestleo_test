const User = require('../Models/User');
const { sendWelcomeEmail, sendToggleUserEmail, sendWelcomeEmailForCoowners, sendToggleUserDeactivateEmail, sendNewAssignmentEmail } = require('../Utils/Email');
const generatePassword = require('generate-password');
const crypto = require('crypto');
const { default: mongoose } = require('mongoose');
const jwt = require('jsonwebtoken');


const Building = require('../Models/Building');
const Apartment = require('../Models/Appartement');

const Bloc = require('../Models/Bloc');
const BuildingCoownerAssociation = require('../Models/building-coowner');


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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

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
      password: updatedUser.password,
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

    // 2. Generate random password
    const password = generatePassword.generate({
      length: 12,
      numbers: true,
      uppercase: true,
      symbols: true,
      strict: true,
      exclude: `'"\\` // Exclude problematic characters
    });

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
  deleteOwnAccount
};