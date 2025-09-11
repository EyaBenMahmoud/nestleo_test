const mongoose = require('mongoose');

const BlocSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    building: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building',
        required: true, // A bloc must belong to a building
    },
    apartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }], // Reference to Apartments
}, { timestamps: true });

const Bloc = mongoose.models.Bloc || mongoose.model('Bloc', BlocSchema);

module.exports = Bloc;