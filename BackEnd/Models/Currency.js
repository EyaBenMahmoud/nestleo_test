// Models/Currency.js
const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  countries: [{ type: String }], // Pays qui utilisent cette devise
  stripeSupported: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Mise à jour automatique de updatedAt
currencySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Currency', currencySchema);