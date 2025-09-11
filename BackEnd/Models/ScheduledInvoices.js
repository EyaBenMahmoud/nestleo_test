// Models/RecurringInvoice.js
const mongoose = require('mongoose');

const recurringInvoiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  building: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  selectedBlocs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bloc'
  }],
  selectedApartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  }],
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  frequency: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'biannually', 'annually'],
    required: true
  },
  nextRun: { type: Date, required: true },
  lastRun: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 1,
  },
  active: { type: Boolean, default: true },
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    required: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// index for better query performance
recurringInvoiceSchema.index({ nextRun: 1, active: 1 });

module.exports = mongoose.model('RecurringInvoice', recurringInvoiceSchema);