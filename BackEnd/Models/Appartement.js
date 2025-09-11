const mongoose = require('mongoose');

const ApartmentSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
    },
    floor: {
        type: Number,
        required: true,
    },
    bloc: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bloc',
        required: true, // An apartment must belong to a bloc
    },
    coOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the owner (if applicable)
    },
    building: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Building',
            required: true, // A bloc must belong to a building
        },

        bedrooms: {
            type: mongoose.Schema.Types.Mixed,
            required: false,
            validate: {
              validator: function(value) {
                // Allow numbers (integers), string numbers, "Studio", and "5+"
                if (typeof value === 'number') {
                  return Number.isInteger(value) && value > 0;
                }
                if (typeof value === 'string') {
                  // Check for special string values
                  if (['Studio', '5+'].includes(value)) {
                    return true;
                  }
                  // Check if it's a string representation of a positive integer
                  const numValue = parseInt(value, 10);
                  return !isNaN(numValue) && numValue > 0 && numValue.toString() === value;
                }
                return false;
              },
              message: 'Bedrooms must be a positive integer, "Studio", or "5+"'
            }
          },

}, { timestamps: true });

// Avoid overwriting the model
const Apartment = mongoose.models.Apartment || mongoose.model('Apartment', ApartmentSchema);

module.exports = Apartment;