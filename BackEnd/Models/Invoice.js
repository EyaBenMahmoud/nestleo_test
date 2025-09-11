// Models/Invoice.js
const mongoose = require('mongoose');



const paymentReceiptSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: Number,
  method: String,
  transactionId: String
});

// Add this schema for payment proof
const paymentProofSchema = new mongoose.Schema({
  filePath: String,
  fileName: String,
  uploadDate: { type: Date, default: Date.now },
  referenceNumber: String,
  paymentDate: Date,
  notes: String,
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewDate: Date,
  reviewNotes: String,
  isApproved: Boolean
});


const invoiceSchema = new mongoose.Schema({
  
  syndicateName: { type: String, required: true },
  buildingAddress: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  coOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
    },

  apartmentNumber: { type: String, required: true },
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
// To this:
taxRate: {  // Add this new field
  type: Number,
  min: 0,
  max: 1,
},
tax: {     // Keep this for the calculated amount
  type: Number,
  min: 0
},
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['paid', 'unpaid', 'pending', 'rejected', 'overdue'], 
    default: 'unpaid' 
  },
    paymentProof: paymentProofSchema,

    notes: { type: String },
  apartmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment' // Make sure this matches your Apartment model name
  }],
apartment: {  // Add this field
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appartement', // Make sure this matches your apartment model name
      required: false
    },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
    
  // Ajouter ce champ pour stocker le nom du building en cas de besoin
  buildingName: { 
    type: String, 
    required: false 
  },


  paymentReceipts: [paymentReceiptSchema],
  paymentDate: Date,
  paymentMethod: String,




    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Currency',
      required: false
    },

    currencyCode: { type: String, required: false }, // Garder le code pour accès rapide
    exchangeRate: { type: Number, default: 1 }, // Taux de change si applicable
    
});

module.exports = mongoose.model('Invoice', invoiceSchema);