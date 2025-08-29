const mongoose = require('mongoose');
const optionSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: true 
  },
  votes: { 
    type: Number, 
    default: 0 
  }
  
});

// Define schema for a single question within a poll
const questionSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: {
    type: String
  },
  options: [optionSchema],
  order: {
    type: Number,
    required: true
  }
});

// Main poll schema
const pollSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  title: {
    type: String, 
    required: true
  },
  description: {
    type: String
  },
  // Replace options with questions array
  questions: [questionSchema],
  
  // Duration per question in seconds
  questionDuration: { 
    type: Number,
    default: 60
  },
  
  // Pause between questions in seconds
  pauseDuration: {
    type: Number,
    default: 5 ,
    required: false
  },
  
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  },
  
  currentQuestion: {
    type: Number,
    default: 0 // Index of the current active question (0 = not started)
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  active: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  startedAt: {
    type: Date
  },
  
  endedAt: {
    type: Date
  },
  
  // Responses now include questionIndex
  responses: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    questionIndex: Number,
    optionIndex: Number,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Add debug pre-save hook
pollSchema.pre('save', function(next) {
  if (this.isModified('responses')) {
    console.log(`Poll ${this._id} saving with ${this.responses.length} responses:`, 
      this.responses.map(r => ({ 
        user: r.user, 
        question: r.questionIndex,
        option: r.optionIndex 
      })));
  }
  next();
});

module.exports = mongoose.model('Poll', pollSchema);