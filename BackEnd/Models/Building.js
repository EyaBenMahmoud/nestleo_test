const mongoose = require('mongoose');

const BuildingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    matricule: {
        type: String,
        required: true,
        unique: true,
    },
    address_street: {
        type: String,
        required: true,
    },
    address_number: {
        type: String,
        required: true,
    },
    address_city: {
        type: String,
        required: true,
    },
    address_country: {
        type: String,
        required: true,
    },
    gps_coordinates: {
        type: String,
        required: false,
    },
    blocs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bloc' }],
    apartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    coOwners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    gamificationEnabled: {
        type: Boolean,
        default: false  
    },
    // Building transfer confirmation fields
    transferConfirmationToken: { type: String },
    transferConfirmationExpire: { type: Date },
    pendingTransferEmail: { type: String },
    transferStatus: {
        type: String,
        enum: ['none', 'pending_email_confirmation', 'pending_final_approval', 'completed', 'failed'],
        default: 'none'
    },
    currentOwnerEmail: { type: String }, // Store current owner email for transfer process
}, { timestamps: true });

const Building = mongoose.models.Building || mongoose.model('Building', BuildingSchema);

module.exports = Building;