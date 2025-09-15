const User = require('../Models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendTwoFaVerificationEmail } = require('../Utils/Email'); // existing helper used elsewhere

// POST /user/2fa/send  (protected)
exports.sendTwoFaCode = async (req, res) => {
  try {
    // extract temp token from header
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Missing temp token' });

    // verify temp token (same secret used when you generated temp token)
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

    // generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // store hashed code + expiry
    const hash = await bcrypt.hash(code, 10);
    user.twoFATempCodeHash = hash;
    user.twoFATempCodeExpire = Date.now() + 1000 * 60 * 10; // 10 minutes
    user.twoFAMethod = user.twoFAMethod || 'email';
    await user.save();

    // send email
    await sendTwoFaVerificationEmail(user.email, code, user.language || 'en');

    return res.json({ message: '2FA code sent', expiresInSeconds: 600 });
  } catch (err) {
    console.error('[2FA] sendTwoFaCode error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
// POST /user/2fa/verify  (protected)
exports.verifyTwoFaCode = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { code } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const user = await User.findById(userId);
    if (!user || !user.twoFATempCodeHash || !user.twoFATempCodeExpire) {
      return res.status(400).json({ message: 'No 2FA code pending verification' });
    }

    if (Date.now() > user.twoFATempCodeExpire.getTime()) {
      // clear
      user.twoFATempCodeHash = undefined;
      user.twoFATempCodeExpire = undefined;
      await user.save();
      return res.status(400).json({ message: '2FA code expired' });
    }

    const match = await bcrypt.compare(code.toString(), user.twoFATempCodeHash);
    if (!match) return res.status(400).json({ message: 'Invalid code' });

    // success -> enable 2FA and clear temp fields
    user.twoStepsVerify = true;
    user.twoFATempCodeHash = undefined;
    user.twoFATempCodeExpire = undefined;
    await user.save();

    return res.json({ message: 'Two-step authentication enabled', twoStepsVerify: true });
  } catch (err) {
    console.error('[2FA] verify error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /user/2fa/disable  (protected)
exports.disableTwoFa = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.twoStepsVerify = false;
    user.twoFATempCodeHash = undefined;
    user.twoFATempCodeExpire = undefined;
    await user.save();

    return res.json({ message: 'Two-step authentication disabled', twoStepsVerify: false });
  } catch (err) {
    console.error('[2FA] disable error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.enableTwoFaDirect = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Activate 2FA immediately (no verification)
    user.twoStepsVerify = true;
    // Clear any temp code fields if present
    user.twoFATempCodeHash = undefined;
    user.twoFATempCodeExpire = undefined;
    await user.save();

    // Return minimal success payload
    return res.json({ message: 'Two-step authentication enabled', twoStepsVerify: true });
  } catch (err) {
    console.error('[2FA] enable direct error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}; 