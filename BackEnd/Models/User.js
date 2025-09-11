const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: false },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: false },
  fakePassword: { type: String, required: false },
  website: { type: String, required: false, default: "https://www.example.com" },
  city: { type: String, required: false },
  country: { type: String, required: false },
  zipCode: { type: String, required: false },
  description: { type: String, required: false },
  language: { 
    type: String, 
    enum: ["en", "fr", "it", "sp"], 
    default: "en",
    required: false 
  },
  role: {
    type: String,
    enum: ["SuperAdmin", "User", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"],
    required: true,
  },
  SubRole: {
    type: String,
    enum: ["It_support", "Technical_Support", "Syndic", "notSyndic"],
    required: false,
  },
  buildings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
    },
  ],
  expiryDate: {
    type: Date,
    required: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  avatar: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: Boolean,
    required: false,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  googleId: String,
  facebookId: String,
  authMethod: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local",
  },
  socials: {
    github: { type: String, default: "https://github.com/default" },
    website: { type: String, default: "https://www.example.com" },
    dribbble: { type: String, default: "https://dribbble.com/default" },
    pinterest: { type: String, default: "https://www.pinterest.com/default" },
    linkedin: { type: String, default: "https://www.linkedin.com/in/default" },
    twitter: { type: String, default: "https://twitter.com/default" },
    instagram: { type: String, default: "https://www.instagram.com/default" },
    facebook: { type: String, default: "https://www.facebook.com/default" },
  },
  subscription: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    stripeSubscriptionId: { type: String },
    status: { type: String, enum: ["active", "inactive", "canceled"], default: "inactive" },
    startDate: { type: Date },
    endDate: { type: Date },
    isTrial: { type: Boolean, default: false },
    upgradePaymentId: { type: String } // For storing one-time payment IDs for upgrades
  },
  subscriptionHistory: [{
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    stripeSubscriptionId: { type: String },
    status: { type: String, enum: ["active", "inactive", "canceled"] },
    startDate: { type: Date },
    endDate: { type: Date },
    isTrial: { type: Boolean, default: false },
    upgradePaymentId: { type: String },
    archivedAt: { type: Date },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  delegates: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['meeting', 'payment', 'both'],
      default: 'both'
    },
    // Pour la délégation de réunion
    meetingDelegation: {
      isActive: { type: Boolean, default: false },
      activatedAt: { type: Date },
      activationToken: { type: String },
      tokenExpiry: { type: Date }
    },
    // Pour la délégation de paiement
    paymentDelegation: {
      isActive: { type: Boolean, default: false },
      sharedPercentage: { type: Number, min: 0, max: 100 },
      delegateAmount: { type: Number, min: 0 }
    },
    createdAt: { type: Date, default: Date.now }
  }],
  apartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  }],
    buildingAssociations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuildingCoownerAssociation'
  }],
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpire: { type: Date },
  // Transfer account confirmation fields
  transferConfirmationToken: { type: String },
  transferConfirmationExpire: { type: Date },
  pendingTransferEmail: { type: String },
  transferStatus: {
    type: String,
    enum: ['none', 'pending_email_confirmation', 'pending_final_approval', 'completed', 'failed'],
    default: 'none'
  },
  gamification: {
    buildings: {
      type: Map,
      of: {
        totalPoints: { type: Number, default: 0 },
        monthlyPoints: { type: Number, default: 0 },
        lastMonthReset: Date,
        paymentStreak: { type: Number, default: 0 },
        meetingStreak: { type: Number, default: 0 },
        votingStreak: { type: Number, default: 0 },
        lastPayment: Date,
        lastMeeting: Date,
        lastVote: Date,
        rank: { type: Number, default: 0 }
      },
      default: {}
    }
  }
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // No trial logic here. Free pack assignment is handled in controller.
  next();
});

// Match user password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


const User = mongoose.models.User || mongoose.model("User", UserSchema);
module.exports = User;