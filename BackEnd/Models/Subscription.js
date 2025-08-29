const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
});

const Subscription = new mongoose.Schema({
  subscriptionType: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  creationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive'
  },
  language: {
    type: String,
    required: true,
    default: "en"
  },
  stripePriceId: {
    type: String,
    required: true
  },
  features: [featureSchema],

  interval: {
    type: String,
    enum: ['month', 'year'], 
    required: true
  },
  isTrial: { type: Boolean, default: false }, 

  stripeProductId: { type: String, required: false },
  stripePriceId: { type: String, required: false },

});

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', Subscription);