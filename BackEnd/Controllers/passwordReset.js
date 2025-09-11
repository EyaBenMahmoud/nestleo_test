const User = require('../Models/User');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../Utils/Email');


const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    console.log("Received email:", req.body.email);

    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save().catch(err => console.error("Error saving user:", err));

    const resetUrl = `${process.env.CLIENT_URL}/auth-pass-change-basic/${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl, user.language || 'en')
    .catch(err => console.error("Error sending email:", err));
  
    res.status(200).json({ message: 'Reset email sent' });
    
  } catch (error) {
  console.error("Forgot Password Error:", error); // Log the error for debugging
  res.status(500).json({ message: 'Server error', error: error.message });
}

};

 const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
    
  } catch (error) {
    console.error("Forgot Password Error:", error); // Log the error for debugging
    res.status(500).json({ message: 'Server error', error: error.message });
  }
  
};

// Export functions in CommonJS format
module.exports = {
    forgotPassword,
    resetPassword
  };