const express = require('express');
const { registerUser, loginUser,loginUserGoogle, verifyEmail, resendVerificationEmail  } = require('../Controllers/AuthController');
const { protect } = require('../Middlewares/AuthMiddleware');
const { forgotPassword, resetPassword } = require('../Controllers/passwordReset');
const passport = require('passport');
const { GenerateToken , directLogin} = require('../Utils/GenrateToken');
const User = require('../Models/User');
const router = express.Router();






router.post('/resend-verification', resendVerificationEmail);
//verify email
router.get('/verify-email', verifyEmail);

//login with google 
router.post('/loginWithGoogle', loginUserGoogle);

//direct login for coowners
router.post('/direct-login',directLogin);

router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected route example
router.get('/profile', protect,(req, res) => {
  res.json(req.user);
});


//reser password :
// Forgot password
router.post('/forgot-password', forgotPassword);
// Reset password
router.put('/reset-password/:token', resetPassword);



//upload Single image  to userProfile
router.post( '/:id/upload');

//delete image 
router.delete('/delete/:id');


///Oauth configuration routes

const  socialAuthSuccess = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(400).json({ message: 'User authentication failed' });
    }

    const token = await GenerateToken(req.user._id); 

    const fakePassword = req.fakePassword || req.user.fakePassword; 

    res.redirect(`${process.env.CLIENT_URL}/redirect?token=${token}&fakePassword=${fakePassword}`);
  } catch (error) {
    console.error("Error in socialAuthSuccess:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

router.get("/login/failed",(req,res)=>{
  res.status(405).json({
    error:true,
    message: "log in failure",
  })
})

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false ,  failureRedirect: '/auth/login/failed'}), 
  (req, res, next) => {
    const user = req.user;
    const fakePassword = req.fakePassword;
     req.fakePassword = fakePassword; // Store fakePassword on req object
    next();  
  }, 
  socialAuthSuccess 
);



router.get('/facebook/callback', passport.authenticate('facebook', {
  session: false,
  failureRedirect: '/login/failed'
}), socialAuthSuccess);


// Get current user profile
const getUserProfile = async (req, res) => {
  try {
    // Find the user by ID from the token
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .populate({
        path: 'subscription.planId',
        populate: {
          path: 'features',
        },
      })
      .populate('subscriptionHistory.planId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the same fields as in loginUser
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
      subscription: user.subscription,
      subscriptionHistory: user.subscriptionHistory || [],
      paymentStatus: user.paymentStatus,
      gamification: user.gamification,
      token: await GenerateToken(user._id),
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }

};
router.get('/redirectProfile',protect, getUserProfile);

module.exports = router;