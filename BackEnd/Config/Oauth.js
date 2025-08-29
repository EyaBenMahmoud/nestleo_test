const passport = require('passport');
const User = require('../Models/User');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const crypto = require('crypto');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  scope: ["profile", "email"],
  passReqToCallback: true 
},
async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    
    // 1. Check for existing user by Google ID or email
    const existingUser = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: email }
      ]
    });

    // 2. Handle different scenarios
    if (existingUser) {
      // Case 1: User exists with Google auth - just return
      if (existingUser.googleId) {
        req.fakePassword = existingUser.fakePassword;
        return done(null, existingUser);
      }
      
      // Case 2: User exists with same email but different auth method
      // Update with Google ID and return
      existingUser.googleId = profile.id;
      existingUser.authMethod = 'google';
      await existingUser.save();
      
      req.fakePassword = existingUser.fakePassword;
      return done(null, existingUser);
    }

    // 3. Create new user if doesn't exist
    const fakePassword = crypto.randomBytes(20).toString('hex');
    const newUser = new User({
      googleId: profile.id,
      email: email,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      authMethod: 'google',
      role: "User",
      password: fakePassword,
      fakePassword: fakePassword,
      isVerified: true,
      subscription: {
        status: "inactive",
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7))
      }
    });

    await newUser.save();
    req.fakePassword = newUser.fakePassword;
    return done(null, newUser);

  } catch (error) {
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      // Race condition occurred - try to find the user again
      const raceUser = await User.findOne({ email: profile.emails[0].value });
      if (raceUser) {
        req.fakePassword = raceUser.fakePassword;
        return done(null, raceUser);
      }
    }
    return done(error, null);
  }
}));
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : `fb_${profile.id}@email.com`;

    let user = await User.findOne({ facebookId: profile.id });

    if (user && !user.facebookId) {
      return done(new Error('Email already registered with another method'), null);
    }

    if (!user) {
      user = await User.create({
        facebookId: profile.id,
        email: email,
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        authMethod: "facebook",
        role: "User",
        password: crypto.randomBytes(20).toString('hex'),
        isVerified: true
      });
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}
));