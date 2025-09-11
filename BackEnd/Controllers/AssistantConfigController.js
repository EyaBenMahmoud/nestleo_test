const AssistantConfig = require('../Models/AssistantConfig');

// Get the active configuration for a specific language
exports.getActiveConfig = async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const config = await AssistantConfig.findOne({ isActive: true, language })
      .sort({ updatedAt: -1 })
      .select('-createdBy');

    if (!config) {
      return res.status(404).json({ message: `No active assistant configuration found for language: ${language}` });
    }

    res.status(200).json(config);
  } catch (error) {
    console.error('Error fetching active assistant config:', error);
    res.status(500).json({ message: 'Failed to fetch assistant configuration', error: error.message });
  }
};

// Get all active configurations (one per language)
exports.getAllActiveConfigs = async (req, res) => {
  try {
    const configs = await AssistantConfig.find({ isActive: true })
      .sort({ language: 1 })
      .select('-createdBy');

    res.status(200).json(configs);
  } catch (error) {
    console.error('Error fetching active assistant configs:', error);
    res.status(500).json({ message: 'Failed to fetch active assistant configurations', error: error.message });
  }
};

// Get all configurations
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await AssistantConfig.find()
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'firstName lastName');

    res.status(200).json(configs);
  } catch (error) {
    console.error('Error fetching assistant configs:', error);
    res.status(500).json({ message: 'Failed to fetch assistant configurations', error: error.message });
  }
};

// Create new configuration
exports.createConfig = async (req, res) => {
  try {
    // Check if user is SuperAdmin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only SuperAdmin can create assistant configurations' });
    }

    // If setting as active, deactivate all other configs for the same language
    if (req.body.isActive) {
      await AssistantConfig.updateMany(
        { language: req.body.language }, 
        { isActive: false }
      );
    }
    
    // Process topics to ensure questions have allowedRoles if defined
    if (req.body.topics && Array.isArray(req.body.topics)) {
      req.body.topics = req.body.topics.map(topic => {
        if (topic.questions && Array.isArray(topic.questions)) {
          topic.questions = topic.questions.map(question => ({
            question: question.question,
            answer: question.answer,
            allowedRoles: Array.isArray(question.allowedRoles) ? question.allowedRoles : []
          }));
        }
        return topic;
      });
    }
    
    // Ensure keywords is properly formatted with allowedRoles
    if (req.body.keywords && Array.isArray(req.body.keywords)) {
      req.body.keywords = req.body.keywords.map(keyword => ({
        keyword: typeof keyword === 'string' ? keyword : keyword.keyword,
        answer: typeof keyword === 'string' ? '' : (keyword.answer || ''),
        allowedRoles: Array.isArray(keyword.allowedRoles) ? keyword.allowedRoles : []
      }));
    } else {
      req.body.keywords = [];
    }
    
    const formattedData = {
      ...req.body,
      createdBy: req.user._id
    };

    const newConfig = new AssistantConfig(formattedData);
    const savedConfig = await newConfig.save();
    
    res.status(201).json(savedConfig);
  } catch (error) {
    console.error('Error creating assistant config:', error);
    res.status(500).json({ message: 'Failed to create assistant configuration', error: error.message });
  }
};

// Update configuration
exports.updateConfig = async (req, res) => {
  try {
    // Check if user is SuperAdmin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only SuperAdmin can update assistant configurations' });
    }

    const { id } = req.params;
    
    // Get the current configuration to check if language is changing
    const currentConfig = await AssistantConfig.findById(id);
    if (!currentConfig) {
      return res.status(404).json({ message: 'Assistant configuration not found' });
    }
    
    // Determine which language to use for activation management
    const targetLanguage = req.body.language || currentConfig.language;

    // If setting as active, deactivate all other configs for the same language
    if (req.body.isActive) {
      await AssistantConfig.updateMany(
        { _id: { $ne: id }, language: targetLanguage }, 
        { isActive: false }
      );
    }

    // Process topics if provided
    if (req.body.topics && Array.isArray(req.body.topics)) {
      req.body.topics = req.body.topics.map(topic => {
        if (topic.questions && Array.isArray(topic.questions)) {
          topic.questions = topic.questions.map(question => ({
            question: question.question,
            answer: question.answer,
            allowedRoles: Array.isArray(question.allowedRoles) ? question.allowedRoles : []
          }));
        }
        return topic;
      });
    }

    // Process keywords if provided with allowedRoles
    if (req.body.keywords && Array.isArray(req.body.keywords)) {
      req.body.keywords = req.body.keywords.map(keyword => ({
        keyword: typeof keyword === 'string' ? keyword : keyword.keyword,
        answer: typeof keyword === 'string' ? '' : (keyword.answer || ''),
        allowedRoles: Array.isArray(keyword.allowedRoles) ? keyword.allowedRoles : []
      }));
    }

    const updatedConfig = await AssistantConfig.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    
    if (!updatedConfig) {
      return res.status(404).json({ message: 'Assistant configuration not found' });
    }
    
    res.status(200).json(updatedConfig);
  } catch (error) {
    console.error('Error updating assistant config:', error);
    res.status(500).json({ message: 'Failed to update assistant configuration', error: error.message });
  }
};

// Delete configuration
exports.deleteConfig = async (req, res) => {
  try {
    // Check if user is SuperAdmin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only SuperAdmin can delete assistant configurations' });
    }

    const { id } = req.params;
    const deletedConfig = await AssistantConfig.findByIdAndDelete(id);
    
    if (!deletedConfig) {
      return res.status(404).json({ message: 'Assistant configuration not found' });
    }
    
    res.status(200).json({ message: 'Assistant configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting assistant config:', error);
    res.status(500).json({ message: 'Failed to delete assistant configuration', error: error.message });
  }
};

// Activate configuration
exports.activateConfig = async (req, res) => {
  try {
    // Check if user is SuperAdmin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only SuperAdmin can activate assistant configurations' });
    }

    const { id } = req.params;
    
    // Find the configuration to get its language
    const config = await AssistantConfig.findById(id);
    if (!config) {
      return res.status(404).json({ message: 'Assistant configuration not found' });
    }
    
    // First, deactivate all configurations for the same language
    await AssistantConfig.updateMany(
      { language: config.language }, 
      { isActive: false }
    );
    
    // Then activate the specified configuration
    const activatedConfig = await AssistantConfig.findByIdAndUpdate(
      id,
      { isActive: true, updatedAt: Date.now() },
      { new: true }
    );

    res.status(200).json(activatedConfig);
  } catch (error) {
    console.error('Error activating assistant config:', error);
    res.status(500).json({ message: 'Failed to activate assistant configuration', error: error.message });
  }
};

// Clone configuration
exports.cloneConfig = async (req, res) => {
  try {
    // Check if user is SuperAdmin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only SuperAdmin can clone assistant configurations' });
    }

    const { id } = req.params;
    
    // Find the configuration to clone
    const sourceConfig = await AssistantConfig.findById(id);
    if (!sourceConfig) {
      return res.status(404).json({ message: 'Assistant configuration not found' });
    }
    
    // Convert to object and remove _id and timestamps
    const configData = sourceConfig.toObject();
    delete configData._id;
    delete configData.createdAt;
    delete configData.updatedAt;
    delete configData.__v;
    
    // Set version to indicate it's a clone and set as inactive
    configData.version = `${configData.version} (Clone)`;
    configData.isActive = false;
    configData.createdBy = req.user._id;
    
    // Create new config
    const newConfig = new AssistantConfig(configData);
    const savedConfig = await newConfig.save();
    
    res.status(201).json(savedConfig);
  } catch (error) {
    console.error('Error cloning assistant config:', error);
    res.status(500).json({ message: 'Failed to clone assistant configuration', error: error.message });
  }
};