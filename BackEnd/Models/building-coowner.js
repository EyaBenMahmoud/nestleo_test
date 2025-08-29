const mongoose = require('mongoose');

const BuildingCoownerAssociationSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  coOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  activatedAt: Date,
  apartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  }],
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastStatusChange: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index pour les recherches rapides
BuildingCoownerAssociationSchema.index({ building: 1, coOwner: 1 }, { unique: true });

const BuildingCoownerAssociation = mongoose.models.BuildingCoownerAssociation || 
  mongoose.model('BuildingCoownerAssociation', BuildingCoownerAssociationSchema);

module.exports = BuildingCoownerAssociation;