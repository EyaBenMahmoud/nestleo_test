const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const GenerateToken = async (userId) => {
  // Only include essential user data in token
  const user = await User.findById(userId)
    .select('_id firstName lastName email role SubRole isActive');

  if (!user) throw new Error('User not found');

  // Create a minimal token with just essential identification
  return jwt.sign(
    {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      website: user.website,
      city: user.city,
      country: user.country,
      zipCode: user.zipCode,
      description: user.description,
      SubRole: user.SubRole,
      avatar: user.avatar,
      isActive: user.isActive || null,
      gamification: user.gamification ? true : false
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Update the directLogin function too
const directLogin = async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.id)
      .populate({
        path: 'subscription.planId',
        select: '_id subscriptionType description price status features interval',
      })
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a minimal session token
    const sessionToken = jwt.sign({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      website: user.website,
      city: user.city,
      country: user.country,
      zipCode: user.zipCode,
      description: user.description,
      SubRole: user.SubRole,
      isActive: user.isActive,
      avatar: user.avatar,
      gamification: user.gamification ? true : false
    }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Clean any image data URLs for transmission
    let cleanUser = user.toObject();

    // If avatar is a data URL, replace with placeholder
    if (cleanUser.avatar && cleanUser.avatar.startsWith('data:image')) {
      // Keep just an indicator that avatar exists
      cleanUser.avatar = true;
    }

    // Remove gamification details from user object sent to client
    if (cleanUser.gamification) {
      // Just indicate gamification exists, don't include full data
      cleanUser.hasGamification = true;
      delete cleanUser.gamification;
    }

    // Return the session token and user data
    res.status(200).json({
      token: sessionToken,
      user: cleanUser
    });
  } catch (error) {
    console.error('Error during direct login:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { GenerateToken, directLogin };