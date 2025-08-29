const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  start: {
    type: Date,
    required: true,
  },
  eventTime: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  location: {
    type: String,
  },
  className: {
    type: String,
  },
    // Ajouter les champs pour les documents
  documents: [{
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: Number },
    fileUrl: { type: String },
    uploadDate: { type: Date, default: Date.now },
    description: { type: String }
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
  },
  // Add these new fields for bloc/apartment targeting
  selectedBlocs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bloc'
  }],
  selectedApartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  }],
  // Change the purpose of isForAllCoOwners to represent entire building selection
  isForAllCoOwners: {
    type: Boolean,
    default: true
  },
  // Keep this for backward compatibility
  selectedCoOwners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  endTime: {  // Ajouter ce champ pour l'heure de fin
    type: String,
  },
  meeting: {
    roomName: { type: String },
    isActive: { type: Boolean, default: false },
    activeParticipants: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      joinedAt: { type: Date, default: Date.now }
    }],
    rewardedAttendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
});

module.exports = mongoose.model("Event", EventSchema);