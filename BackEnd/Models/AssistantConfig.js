const mongoose = require("mongoose");

const AssistantAnswerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  allowedRoles: [{ 
    type: String,
    enum: ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"]
  }]
});

const AssistantTopicSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true, default: 'help-circle' },
  questions: [AssistantAnswerSchema],
  allowedRoles: [{ 
    type: String,
    enum: ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"]
  }]
});

const AssistantKeywordSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  answer: { type: String, required: true },
  allowedRoles: [{ 
    type: String,
    enum: ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"]
  }]
});

const AssistantRolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"],
    required: true
  },
  allowedTopics: [{ type: String }],
  permissions: { type: mongoose.Schema.Types.Mixed }
});

const AssistantConfigSchema = new mongoose.Schema({
  version: { 
    type: String,
    default: "1.0.0",
    required: true
  },
  language: {
    type: String,
    required: true,
    default: "en"  // Default to English
  },
  topics: [AssistantTopicSchema],
  keywords: [AssistantKeywordSchema],
  rolePermissions: [AssistantRolePermissionSchema],
  welcomeMessages: [{
    role: {
      type: String,
      enum: ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker", "Guest"]
    },
    message: { type: String }
  }],
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Add a compound index to ensure topic.id uniqueness within a configuration
AssistantConfigSchema.index({ 'topics.id': 1, '_id': 1 }, { unique: true });

const AssistantConfig = mongoose.model("AssistantConfig", AssistantConfigSchema);
module.exports = AssistantConfig;