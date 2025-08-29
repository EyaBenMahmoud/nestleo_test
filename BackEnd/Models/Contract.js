const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
  contractNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Expired', 'Terminated', 'Archived'],
    default: 'Draft',
    required: true,
  },
  terms: { 
    type: String, 
    required: true 
  },
  signedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  // Added for co-owner contracts
  coOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Added for building reference
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building'
  },
  contractType: {
    type: String,
    enum: ['standard', 'co-owner'],
    default: 'standard'
  },
  archived: {
    type: Boolean,
    default: false,
  },
  archivedAt: {
    type: Date,
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
});

// Pre-save hook to update the `updatedAt` field whenever the document is updated
ContractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Contract', ContractSchema);