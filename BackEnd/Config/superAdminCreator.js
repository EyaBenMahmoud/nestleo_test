const User = require('../Models/User');
const bcrypt = require('bcryptjs');

const createSuperAdmin = async () => {
  try {
    const superAdminExists = await User.findOne({ role: 'SuperAdmin' });
    
    if (!superAdminExists) {
      await User.create({
        firstName: process.env.SUPERADMIN_FIRSTNAME || 'Super',
        lastName: process.env.SUPERADMIN_LASTNAME || 'Admin',
        email: process.env.SUPERADMIN_EMAIL,
        password: process.env.SUPERADMIN_PASSWORD,
        role: 'SuperAdmin',
        isEmailVerified: true,
      });
      console.log('SuperAdmin account created successfully!');
    }
  } catch (error) {
    console.error('Error creating SuperAdmin:', error.message);
  }
};

module.exports = createSuperAdmin;