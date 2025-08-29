const mongoose = require("mongoose");

const ClaimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Resolved", "Rejected"],
    default: "Pending"
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  adminNote: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Claim = mongoose.models.Claim || mongoose.model('Claim', ClaimSchema);
module.exports = Claim;