import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Modal, ModalHeader, ModalBody, ModalFooter, Button, 
  Form, FormGroup, Label, Input, Nav, NavItem, NavLink, 
  TabContent, TabPane, Row, Col, Alert, Badge, Spinner
} from 'reactstrap';
import { nanoid } from 'nanoid';
import FeatherIcon from 'feather-icons-react';
import { createConfig, updateConfig } from '../../slices/Assistant/assistantConfigSlice';

const AssistantConfigModal = ({ isOpen, toggle, config, isEditing }) => {
  const dispatch = useDispatch();
  const { actionInProgress, error } = useSelector(state => state.assistantConfig);
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    version: '',
    language: 'en',
    topics: [],
    keywords: [],
    rolePermissions: [],
    welcomeMessages: [],
    isActive: false
  });

  // For adding new topics
  const [newTopic, setNewTopic] = useState({ id: '', name: '', icon: 'help-circle', questions: [], allowedRoles: [] });
  // For editing existing topics
  const [editingTopicIndex, setEditingTopicIndex] = useState(null);
  // For managing topic questions
  const [newTopicQuestion, setNewTopicQuestion] = useState({ 
    question: '', 
    answer: '', 
    allowedRoles: [] 
  });
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  
  // For managing keywords
  const [keywordForm, setKeywordForm] = useState({ keyword: '', answer: '', allowedRoles: [] });
  const [editingKeywordIndex, setEditingKeywordIndex] = useState(null);
  
  // For role permissions
  const [newPermission, setNewPermission] = useState({
    role: 'SuperAdmin',
    allowedTopics: [],
    permissions: {}
  });
  
  // For welcome messages
  const [welcomeMessageForm, setWelcomeMessageForm] = useState({
    role: 'SuperAdmin',
    message: ''
  });
  const [editingWelcomeIndex, setEditingWelcomeIndex] = useState(null);
  
  // For delete confirmations
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState(null);

  const roles = ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"];
  const featherIcons = [
    'home', 'building', 'alert-circle', 'check-square', 'calendar', 
    'message-square', 'credit-card', 'users', 'bell', 'file', 
    'dollar-sign', 'help-circle', 'settings', 'shield', 'key'
  ];
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'ar', name: 'Arabic' }
  ];

  useEffect(() => {
    if (isOpen && config && isEditing) {
      // Loading existing configuration
      setFormData({
        version: config.version || '',
        language: config.language || 'en',
        topics: config.topics || [],
        keywords: config.keywords || [],
        rolePermissions: config.rolePermissions || [],
        welcomeMessages: config.welcomeMessages || [],
        isActive: config.isActive || false
      });
    } else if (isOpen && !isEditing) {
      // Reset form for new configuration
      setFormData({
        version: '',
        language: 'en',
        topics: [],
        keywords: [],
        rolePermissions: [],
        welcomeMessages: [],
        isActive: false
      });
    }
    
    // Reset all editing states
    resetEditingStates();
  }, [config, isEditing, isOpen]);

  const resetEditingStates = () => {
    setNewTopic({ id: '', name: '', icon: 'help-circle', questions: [], allowedRoles: [] });
    setEditingTopicIndex(null);
    setNewTopicQuestion({ question: '', answer: '', allowedRoles: [] });
    setEditingQuestionIndex(null);
    setEditingTopicId(null);
    setKeywordForm({ keyword: '', answer: '', allowedRoles: [] });
    setEditingKeywordIndex(null);
    setNewPermission({
      role: 'SuperAdmin',
      allowedTopics: [],
      permissions: {}
    });
    setWelcomeMessageForm({
      role: 'SuperAdmin',
      message: ''
    });
    setEditingWelcomeIndex(null);
    setShowDeleteTopicConfirm(null);
  };

  // Helper function to save changes immediately when a modification is made
  const saveChanges = (updatedData) => {
    if (isEditing && config) {
      dispatch(updateConfig({
        id: config._id,
        configData: updatedData
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  // ---- TOPIC FUNCTIONS ----
  
  const handleTopicChange = (e) => {
    const { name, value } = e.target;
    setNewTopic(prev => ({
      ...prev,
      [name]: value,
      id: name === 'name' ? value.toLowerCase().replace(/\s+/g, '-') : prev.id
    }));
  };

  const toggleRoleForTopic = (role) => {
    setNewTopic(prev => {
      const roleExists = prev.allowedRoles.includes(role);
      
      return {
        ...prev,
        allowedRoles: roleExists
          ? prev.allowedRoles.filter(r => r !== role)
          : [...prev.allowedRoles, role]
      };
    });
  };

  const addTopic = () => {
    if (!newTopic.name) return;
    
    const topicId = newTopic.id || `topic-${nanoid(6)}`;
    const newTopicWithId = {
      ...newTopic,
      id: topicId,
      questions: []
    };
    
    const updatedFormData = {
      ...formData,
      topics: [...formData.topics, newTopicWithId]
    };
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setNewTopic({ id: '', name: '', icon: 'help-circle', questions: [], allowedRoles: [] });
  };

  const startEditingTopic = (index) => {
    setEditingTopicIndex(index);
    const topic = formData.topics[index];
    setNewTopic({
      id: topic.id,
      name: topic.name,
      icon: topic.icon || 'help-circle',
      allowedRoles: topic.allowedRoles || []
    });
  };

  const cancelEditingTopic = () => {
    setEditingTopicIndex(null);
    setNewTopic({ id: '', name: '', icon: 'help-circle', questions: [], allowedRoles: [] });
  };

  const updateTopic = () => {
  if (!newTopic.name) return;

  // Deep copy topics array
  const updatedTopics = formData.topics.map((topic, idx) =>
    idx === editingTopicIndex
      ? {
          ...topic,
          name: newTopic.name,
          icon: newTopic.icon,
          allowedRoles: newTopic.allowedRoles
        }
      : topic
  );

  const updatedFormData = {
    ...formData,
    topics: updatedTopics
  };

  setFormData(updatedFormData);
  if (isEditing) saveChanges(updatedFormData);

  setEditingTopicIndex(null);
  setNewTopic({ id: '', name: '', icon: 'help-circle', questions: [], allowedRoles: [] });
};

  const confirmDeleteTopic = (index) => {
    setShowDeleteTopicConfirm(index);
  };

  const cancelDeleteTopic = () => {
    setShowDeleteTopicConfirm(null);
  };

  const removeTopic = (index) => {
    const updatedFormData = {...formData};
    updatedFormData.topics.splice(index, 1);
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setShowDeleteTopicConfirm(null);
    if (editingTopicId === formData.topics[index].id) {
      setEditingTopicId(null);
    }
  };

  const toggleQuestionsList = (topicId) => {
    setEditingTopicId(editingTopicId === topicId ? null : topicId);
  };

  // Topic Question Functions
  const handleTopicQuestionChange = (e) => {
    const { name, value } = e.target;
    setNewTopicQuestion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleRoleForQuestion = (role) => {
    setNewTopicQuestion(prev => {
      const roleExists = prev.allowedRoles.includes(role);
      
      return {
        ...prev,
        allowedRoles: roleExists
          ? prev.allowedRoles.filter(r => r !== role)
          : [...prev.allowedRoles, role]
      };
    });
  };

  const addTopicQuestion = (topicIndex) => {
    if (!newTopicQuestion.question || !newTopicQuestion.answer) return;
    
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    
    // Ensure the questions array exists
    if (!updatedFormData.topics[topicIndex].questions) {
      updatedFormData.topics[topicIndex].questions = [];
    }
    
    // Add the new question with allowed roles
    updatedFormData.topics[topicIndex].questions.push({
      question: newTopicQuestion.question,
      answer: newTopicQuestion.answer,
      allowedRoles: [...newTopicQuestion.allowedRoles]
    });
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setNewTopicQuestion({ question: '', answer: '', allowedRoles: [] });
  };

  const startEditingTopicQuestion = (topicIndex, questionIndex) => {
    setEditingQuestionIndex(questionIndex);
    
    // Load current question data including allowed roles
    const question = formData.topics[topicIndex].questions[questionIndex];
    setNewTopicQuestion({
      question: question.question,
      answer: question.answer,
      allowedRoles: question.allowedRoles ? [...question.allowedRoles] : []
    });
  };

  const updateTopicQuestion = (topicIndex) => {
    if (!newTopicQuestion.question || !newTopicQuestion.answer) return;
    
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    
    // Update the specific question with allowed roles
    updatedFormData.topics[topicIndex].questions[editingQuestionIndex] = {
      question: newTopicQuestion.question,
      answer: newTopicQuestion.answer,
      allowedRoles: [...newTopicQuestion.allowedRoles]
    };
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setEditingQuestionIndex(null);
    setNewTopicQuestion({ question: '', answer: '', allowedRoles: [] });
  };

  const removeTopicQuestion = (topicIndex, questionIndex) => {
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    updatedFormData.topics[topicIndex].questions.splice(questionIndex, 1);
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
  };

  const cancelEditingTopicQuestion = () => {
    setEditingQuestionIndex(null);
    setNewTopicQuestion({ question: '', answer: '', allowedRoles: [] });
  };

  // ---- KEYWORD FUNCTIONS ----
  
  const handleKeywordChange = (e) => {
    const { name, value } = e.target;
    setKeywordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleRoleForKeyword = (role) => {
    setKeywordForm(prev => {
      const roleExists = prev.allowedRoles.includes(role);
      
      return {
        ...prev,
        allowedRoles: roleExists
          ? prev.allowedRoles.filter(r => r !== role)
          : [...prev.allowedRoles, role]
      };
    });
  };

  const addKeyword = () => {
    if (!keywordForm.keyword) return;
    
    // Create deep copy to ensure we're not modifying any readonly properties
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    
    updatedFormData.keywords.push({
      keyword: keywordForm.keyword,
      answer: keywordForm.answer,
      allowedRoles: [...keywordForm.allowedRoles]
    });
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setKeywordForm({ keyword: '', answer: '', allowedRoles: [] });
  };

  const startEditingKeyword = (index) => {
    setEditingKeywordIndex(index);
    const keyword = formData.keywords[index];
    setKeywordForm({
      keyword: keyword.keyword,
      answer: keyword.answer,
      allowedRoles: keyword.allowedRoles ? [...keyword.allowedRoles] : []
    });
  };

  const updateKeyword = () => {
    if (!keywordForm.keyword) return;
    
    // Create a deep copy of the formData to ensure we're not modifying any readonly properties
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    
    // Now update the specific keyword in the deep-copied array
    updatedFormData.keywords[editingKeywordIndex] = {
      keyword: keywordForm.keyword,
      answer: keywordForm.answer,
      allowedRoles: [...keywordForm.allowedRoles]
    };
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setEditingKeywordIndex(null);
    setKeywordForm({ keyword: '', answer: '', allowedRoles: [] });
  };

  const cancelEditingKeyword = () => {
    setEditingKeywordIndex(null);
    setKeywordForm({ keyword: '', answer: '', allowedRoles: [] });
  };

  const removeKeyword = (index) => {
    // Create deep copy to avoid immutability issues
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    updatedFormData.keywords.splice(index, 1);
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
  };

  // ---- PERMISSION FUNCTIONS ----

  const handlePermissionChange = (e) => {
    const { name, value } = e.target;
    setNewPermission(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleTopicForRole = (topicId) => {
    setNewPermission(prev => {
      const topicExists = prev.allowedTopics.includes(topicId);
      
      return {
        ...prev,
        allowedTopics: topicExists
          ? prev.allowedTopics.filter(id => id !== topicId)
          : [...prev.allowedTopics, topicId]
      };
    });
  };

  const saveRolePermission = () => {
    // Check if role already exists
    const roleIndex = formData.rolePermissions.findIndex(p => p.role === newPermission.role);
    
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    
    if (roleIndex >= 0) {
      // Update existing role permission
      updatedFormData.rolePermissions[roleIndex] = {...newPermission};
    } else {
      // Add new role permission
      updatedFormData.rolePermissions.push({...newPermission});
    }
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    // Reset form
    setNewPermission({
      role: 'SuperAdmin',
      allowedTopics: [],
      permissions: {}
    });
  };

  const removeRolePermission = (index) => {
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    updatedFormData.rolePermissions.splice(index, 1);
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
  };

  const loadRolePermission = (rolePermission) => {
    setNewPermission({
      role: rolePermission.role,
      allowedTopics: rolePermission.allowedTopics || [],
      permissions: rolePermission.permissions || {}
    });
  };

  // ---- WELCOME MESSAGES FUNCTIONS ----
  
  const handleWelcomeMessageChange = (e) => {
    const { name, value } = e.target;
    setWelcomeMessageForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveWelcomeMessage = () => {
    if (!welcomeMessageForm.message) return;
    
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    
    if (editingWelcomeIndex !== null) {
      updatedFormData.welcomeMessages[editingWelcomeIndex] = {...welcomeMessageForm};
      setEditingWelcomeIndex(null);
    } else {
      // Check if message for this role already exists
      const existingIndex = updatedFormData.welcomeMessages.findIndex(m => m.role === welcomeMessageForm.role);
      
      if (existingIndex >= 0) {
        updatedFormData.welcomeMessages[existingIndex] = {...welcomeMessageForm};
      } else {
        updatedFormData.welcomeMessages.push({...welcomeMessageForm});
      }
    }
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
    
    setWelcomeMessageForm({
      role: 'SuperAdmin',
      message: ''
    });
  };

  const editWelcomeMessage = (index) => {
    const message = formData.welcomeMessages[index];
    setWelcomeMessageForm({
      role: message.role,
      message: message.message
    });
    setEditingWelcomeIndex(index);
  };

  const cancelEditingWelcome = () => {
    setEditingWelcomeIndex(null);
    setWelcomeMessageForm({
      role: 'SuperAdmin',
      message: ''
    });
  };

  const removeWelcomeMessage = (index) => {
    const updatedFormData = JSON.parse(JSON.stringify(formData));
    updatedFormData.welcomeMessages.splice(index, 1);
    
    setFormData(updatedFormData);
    if (isEditing) saveChanges(updatedFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditing && config) {
      dispatch(updateConfig({
        id: config._id,
        configData: formData
      }));
    } else {
      dispatch(createConfig(formData));
    }
    
    // Close modal only on successful operation (handled in parent component via success message in slice)
  };

  const getTopicIndexById = (topicId) => {
    return formData.topics.findIndex(topic => topic.id === topicId);
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        {isEditing ? `Edit Assistant Configuration: ${config?.version}` : 'Create New Assistant Configuration'}
      </ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}
        
        <Nav tabs className="mb-3">
          <NavItem>
            <NavLink
              className={activeTab === 'general' ? 'active' : ''}
              onClick={() => setActiveTab('general')}
              style={{ cursor: 'pointer' }}
            >
              General
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'topics' ? 'active' : ''}
              onClick={() => setActiveTab('topics')}
              style={{ cursor: 'pointer' }}
            >
              Topics
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'keywords' ? 'active' : ''}
              onClick={() => setActiveTab('keywords')}
              style={{ cursor: 'pointer' }}
            >
              Keywords
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'permissions' ? 'active' : ''}
              onClick={() => setActiveTab('permissions')}
              style={{ cursor: 'pointer' }}
            >
              Role Permissions
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'welcome' ? 'active' : ''}
              onClick={() => setActiveTab('welcome')}
              style={{ cursor: 'pointer' }}
            >
              Welcome Messages
            </NavLink>
          </NavItem>
        </Nav>
        
        <Form onSubmit={handleSubmit}>
          <TabContent activeTab={activeTab}>
            {/* General Tab */}
            <TabPane tabId="general">
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <Label for="version">Version*</Label>
                    <Input
                      type="text"
                      id="version"
                      name="version"
                      placeholder="e.g., 1.0.0"
                      value={formData.version}
                      onChange={handleChange}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label for="language">Language*</Label>
                    <Input
                      type="select"
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <FormGroup check className="mb-3">
                <Label check>
                  <Input 
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  Set as active configuration (will deactivate other configurations for the same language)
                </Label>
              </FormGroup>
            </TabPane>
            
            {/* Topics Tab */}
            <TabPane tabId="topics">
              <Row className="mb-3">
                <Col md={12}>
                  <h5>Add New Topic</h5>
                  <Row>
                    <Col md={4}>
                      <FormGroup>
                        <Label for="topicName">Topic Name*</Label>
                        <Input
                          type="text"
                          id="topicName"
                          name="name"
                          value={newTopic.name}
                          onChange={handleTopicChange}
                          placeholder="e.g., Building Management"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <Label for="topicIcon">Icon</Label>
                        <Input
                          type="select"
                          id="topicIcon"
                          name="icon"
                          value={newTopic.icon}
                          onChange={handleTopicChange}
                        >
                          {featherIcons.map(icon => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      {editingTopicIndex !== null ? (
                        <div className="d-flex">
                          <Button color="success" onClick={updateTopic} className="me-1" disabled={!newTopic.name}>
                            <FeatherIcon icon="check" size={16} />
                            {' '}Update Topic
                          </Button>
                          <Button color="secondary" onClick={cancelEditingTopic}>
                            <FeatherIcon icon="x" size={16} />
                            {' '}Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button color="primary" onClick={addTopic} disabled={!newTopic.name}>
                          <FeatherIcon icon="plus" size={16} />
                          {' '}Add Topic
                        </Button>
                      )}
                    </Col>
                  </Row>
                  <Row>
                    <Col md={12}>
                      <FormGroup>
                        <Label>Allowed Roles</Label>
                        <div className="d-flex flex-wrap">
                          {roles.map(role => (
                            <div key={role} className="me-3 mb-2">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`topic-role-${role}`}
                                  checked={newTopic.allowedRoles.includes(role)}
                                  onChange={() => toggleRoleForTopic(role)}
                                />
                                <label className="form-check-label" htmlFor={`topic-role-${role}`}>
                                  {role}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>
                </Col>
              </Row>
              <hr />
              <h5>Topics List</h5>
              {formData.topics.length === 0 ? (
                <div className="text-center p-3 bg-light rounded">
                  <FeatherIcon icon="info" size={18} />
                  <p className="mb-0">No topics added yet.</p>
                </div>
              ) : (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th style={{width: "40%"}}>Topic</th>
                      <th style={{width: "20%"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.topics.map((topic, index) => (
                      <React.Fragment key={topic.id || index}>
                        <tr 
                          onClick={() => toggleQuestionsList(topic.id)} 
                          style={{ cursor: 'pointer' }}
                          className={editingTopicId === topic.id ? "bg-light" : ""}
                        >
                          <td>
                            <div className="d-flex align-items-center">
                              <FeatherIcon icon={topic.icon || 'help-circle'} size={16} className="me-2" />
                              <span className="fw-bold">{topic.name}</span>
                              <FeatherIcon 
                                icon={editingTopicId === topic.id ? "chevron-up" : "chevron-down"} 
                                size={14} 
                                className="ms-2"
                              />
                            </div>
                          </td>
                          
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              color="info" 
                              size="sm" 
                              className="me-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingTopic(index);
                              }}
                            >
                              <FeatherIcon icon="edit" size={14} />
                            </Button>
                            <Button 
                              color="danger" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteTopic(index);
                              }}
                            >
                              <FeatherIcon icon="trash-2" size={14} />
                            </Button>
                            
                            {/* Delete Confirmation */}
                            {showDeleteTopicConfirm === index && (
                              <div className="mt-2 d-flex">
                                <span className="me-2">Confirm delete?</span>
                                <Button 
                                  color="danger" 
                                  size="sm" 
                                  className="me-1" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTopic(index);
                                  }}
                                >
                                  Yes
                                </Button>
                                <Button 
                                  color="secondary" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelDeleteTopic();
                                  }}
                                >
                                  No
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                        
                        {/* Questions Section - Expanded when topic is selected */}
                        {editingTopicId === topic.id && (
                          <tr>
                            <td colSpan="3" className="p-0">
                              <div className="p-3 bg-light">
                                <h6 className="mb-3">Questions and Answers</h6>
                                
                                {/* Add New Question Form */}
                                <Row className="mb-3">
                                  <Col md={4}>
                                    <FormGroup>
                                      <Label for="topicQuestionText">Question*</Label>
                                      <Input
                                        type="text"
                                        id="topicQuestionText"
                                        name="question"
                                        value={newTopicQuestion.question}
                                        onChange={handleTopicQuestionChange}
                                        placeholder="e.g., How do I access building reports?"
                                      />
                                    </FormGroup>
                                  </Col>
                                  <Col md={4}>
                                    <FormGroup>
                                      <Label for="topicAnswerText">Answer*</Label>
                                      <Input
                                        type="textarea"
                                        id="topicAnswerText"
                                        name="answer"
                                        value={newTopicQuestion.answer}
                                        onChange={handleTopicQuestionChange}
                                        placeholder="Provide a detailed answer..."
                                        rows={2}
                                      />
                                    </FormGroup>
                                  </Col>
                                  <Col md={4}>
                                    <FormGroup>
                                      <Label>Allowed Roles</Label>
                                      <div className="d-flex flex-wrap">
                                        {roles.map(role => (
                                          <div key={role} className="me-3 mb-2">
                                            <div className="form-check">
                                              <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`question-role-${role}-${index}`}
                                                checked={newTopicQuestion.allowedRoles.includes(role)}
                                                onChange={() => toggleRoleForQuestion(role)}
                                              />
                                              <label className="form-check-label" htmlFor={`question-role-${role}-${index}`}>
                                                {role}
                                              </label>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </FormGroup>
                                  </Col>
                                </Row>
                                <Row>
                                  <Col className="d-flex justify-content-end">
                                    {editingQuestionIndex !== null ? (
                                      <div className="d-flex">
                                        <Button 
                                          color="success" 
                                          onClick={() => updateTopicQuestion(index)}
                                          disabled={!newTopicQuestion.question || !newTopicQuestion.answer}
                                          className="me-1"
                                        >
                                          <FeatherIcon icon="check" size={14} /> Save
                                        </Button>
                                        <Button 
                                          color="secondary" 
                                          onClick={cancelEditingTopicQuestion}
                                        >
                                          <FeatherIcon icon="x" size={14} /> Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        color="primary" 
                                        onClick={() => addTopicQuestion(index)}
                                        disabled={!newTopicQuestion.question || !newTopicQuestion.answer}
                                      >
                                        <FeatherIcon icon="plus" size={14} className="me-1" />
                                        Add Question
                                      </Button>
                                    )}
                                  </Col>
                                </Row>
                                
                                <hr />
                                
                                {/* Questions List */}
                                {topic.questions && topic.questions.length > 0 ? (
                                  <table className="table table-bordered">
                                    <thead>
                                      <tr>
                                        <th style={{width: "35%"}}>Question</th>
                                        <th style={{width: "35%"}}>Answer</th>
                                        <th style={{width: "20%"}}>Allowed Roles</th>
                                        <th style={{width: "10%"}}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {topic.questions.map((q, qIndex) => (
                                        <tr key={qIndex}>
                                          <td>{q.question}</td>
                                          <td>{q.answer}</td>
                                          <td>
                                            {(q.allowedRoles && q.allowedRoles.length > 0) ? (
                                              <div className="d-flex flex-wrap">
                                                {q.allowedRoles.map((role, roleIndex) => (
                                                  <Badge
                                                    key={roleIndex}
                                                    color="info"
                                                    className="me-1 mb-1 p-1"
                                                  >
                                                    {role}
                                                  </Badge>
                                                ))}
                                              </div>
                                            ) : (
                                              <small className="text-muted">All roles</small>
                                            )}
                                          </td>
                                          <td className="text-center">
                                            <Button 
                                              color="info" 
                                              size="sm"
                                              className="me-1"
                                              onClick={() => startEditingTopicQuestion(index, qIndex)}
                                            >
                                              <FeatherIcon icon="edit" size={14} />
                                            </Button>
                                            <Button 
                                              color="danger" 
                                              size="sm" 
                                              onClick={() => removeTopicQuestion(index, qIndex)}
                                            >
                                              <FeatherIcon icon="trash-2" size={14} />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="text-center p-3 bg-light rounded">
                                    <p className="mb-0">No questions added for this topic.</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </TabPane>
            
            {/* Keywords Tab */}
            <TabPane tabId="keywords">
              <Row className="mb-3">
                <Col md={12}>
                  <h5>Add New Keyword</h5>
                  <Row>
                    <Col md={4}>
                      <FormGroup>
                        <Label for="keywordText">Keyword*</Label>
                        <Input
                          type="text"
                          id="keywordText"
                          name="keyword"
                          value={keywordForm.keyword}
                          onChange={handleKeywordChange}
                          placeholder="e.g., password reset"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <Label for="keywordAnswer">Answer</Label>
                        <Input
                          type="textarea"
                          id="keywordAnswer"
                          name="answer"
                          value={keywordForm.answer}
                          onChange={handleKeywordChange}
                          placeholder="Response for this keyword"
                          rows={2}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      {editingKeywordIndex !== null ? (
                        <div className="d-flex">
                          <Button color="success" onClick={updateKeyword} className="me-1" disabled={!keywordForm.keyword}>
                            <FeatherIcon icon="check" size={16} />
                          </Button>
                          <Button color="secondary" onClick={cancelEditingKeyword}>
                            <FeatherIcon icon="x" size={16} />
                          </Button>
                        </div>
                      ) : (
                        <Button color="primary" onClick={addKeyword} disabled={!keywordForm.keyword}>
                          <FeatherIcon icon="plus" size={16} />
                          {' '}Add Keyword
                        </Button>
                      )}
                    </Col>
                  </Row>
                  <Row>
                    <Col md={12}>
                      <FormGroup>
                        <Label>Allowed Roles</Label>
                        <div className="d-flex flex-wrap">
                          {roles.map(role => (
                            <div key={role} className="me-3 mb-2">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`keyword-role-${role}`}
                                  checked={keywordForm.allowedRoles.includes(role)}
                                  onChange={() => toggleRoleForKeyword(role)}
                                />
                                <label className="form-check-label" htmlFor={`keyword-role-${role}`}>
                                  {role}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>
                </Col>
              </Row>
              <hr />
              <h5>Keywords List</h5>
              {formData.keywords.length === 0 ? (
                <div className="text-center p-3 bg-light rounded">
                  <FeatherIcon icon="info" size={18} />
                  <p className="mb-0">No keywords added yet.</p>
                </div>
              ) : (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th style={{width: "30%"}}>Keyword</th>
                      <th style={{width: "35%"}}>Answer</th>
                      <th style={{width: "20%"}}>Allowed Roles</th>
                      <th style={{width: "15%"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.keywords.map((kw, index) => (
                      <tr key={index}>
                        <td>{kw.keyword}</td>
                        <td>{kw.answer}</td>
                        <td>
                          {(kw.allowedRoles && kw.allowedRoles.length > 0) ? (
                            <div className="d-flex flex-wrap">
                              {kw.allowedRoles.map((role, roleIndex) => (
                                <Badge
                                  key={roleIndex}
                                  color="info"
                                  className="me-1 mb-1 p-1"
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <small className="text-muted">All roles</small>
                          )}
                        </td>
                        <td className="text-center">
                          <Button color="info" size="sm" className="me-1" onClick={() => startEditingKeyword(index)}>
                            <FeatherIcon icon="edit" size={14} />
                          </Button>
                          <Button color="danger" size="sm" onClick={() => removeKeyword(index)}>
                            <FeatherIcon icon="trash-2" size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabPane>
            
            {/* Permissions Tab */}
            <TabPane tabId="permissions">
              <Row className="mb-3">
                <Col md={12}>
                  <h5>Role Permissions</h5>
                  <Row>
                    <Col md={4}>
                      <FormGroup>
                        <Label for="role">Role</Label>
                        <Input
                          type="select"
                          id="role"
                          name="role"
                          value={newPermission.role}
                          onChange={handlePermissionChange}
                        >
                          {roles.map(role => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={8} className="d-flex align-items-end mb-3">
                      <Button color="primary" onClick={saveRolePermission}>
                        <FeatherIcon icon="save" size={16} />
                        {' '}Save Role Permissions
                      </Button>
                    </Col>
                  </Row>
                  
                  <h6>Allowed Topics</h6>
                  <div className="mb-3">
                    {formData.topics.length === 0 ? (
                      <Alert color="info">No topics available. Add topics first.</Alert>
                    ) : (
                      <div className="d-flex flex-wrap">
                        {formData.topics.map(topic => (
                          <div key={topic.id} className="me-3 mb-2">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`permission-topic-${topic.id}`}
                                checked={newPermission.allowedTopics.includes(topic.id)}
                                onChange={() => toggleTopicForRole(topic.id)}
                              />
                              <label className="form-check-label" htmlFor={`permission-topic-${topic.id}`}>
                                {topic.name}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
              <hr />
              <h5>Saved Role Permissions</h5>
              {formData.rolePermissions.length === 0 ? (
                <div className="text-center p-3 bg-light rounded">
                  <FeatherIcon icon="info" size={18} />
                  <p className="mb-0">No role permissions defined yet.</p>
                </div>
              ) : (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th style={{width: "20%"}}>Role</th>
                      <th style={{width: "65%"}}>Allowed Topics</th>
                      <th style={{width: "15%"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.rolePermissions.map((permission, index) => (
                      <tr key={index}>
                        <td>{permission.role}</td>
                        <td>
                          <div className="d-flex flex-wrap">
                            {permission.allowedTopics && permission.allowedTopics.map(topicId => {
                              const topic = formData.topics.find(t => t.id === topicId);
                              return topic ? (
                                <Badge key={topicId} color="primary" className="me-1 mb-1 p-1">
                                  {topic.name}
                                </Badge>
                              ) : null;
                            })}
                            {(!permission.allowedTopics || permission.allowedTopics.length === 0) && (
                              <small className="text-muted">No topics allowed</small>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <Button color="info" size="sm" className="me-1" onClick={() => loadRolePermission(permission)}>
                            <FeatherIcon icon="edit" size={14} />
                          </Button>
                          <Button color="danger" size="sm" onClick={() => removeRolePermission(index)}>
                            <FeatherIcon icon="trash-2" size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabPane>
            
            {/* Welcome Messages Tab */}
            <TabPane tabId="welcome">
              <Row className="mb-3">
                <Col md={12}>
                  <h5>Welcome Messages</h5>
                  <Row>
                    <Col md={3}>
                      <FormGroup>
                        <Label for="messageRole">Role</Label>
                        <Input
                          type="select"
                          id="messageRole"
                          name="role"
                          value={welcomeMessageForm.role}
                          onChange={handleWelcomeMessageChange}
                        >
                          {[...roles, "Guest"].map(role => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={7}>
                      <FormGroup>
                        <Label for="welcomeMessage">Message</Label>
                        <Input
                          type="textarea"
                          id="welcomeMessage"
                          name="message"
                          value={welcomeMessageForm.message}
                          onChange={handleWelcomeMessageChange}
                          placeholder="Welcome message for this role"
                          rows={2}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                      {editingWelcomeIndex !== null ? (
                        <div className="d-flex">
                          <Button 
                            color="success" 
                            onClick={saveWelcomeMessage}
                            className="me-1" 
                            disabled={!welcomeMessageForm.message}
                          >
                            <FeatherIcon icon="check" size={16} />
                          </Button>
                          <Button 
                            color="secondary" 
                            onClick={cancelEditingWelcome}
                          >
                            <FeatherIcon icon="x" size={16} />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          color="primary" 
                          onClick={saveWelcomeMessage}
                          disabled={!welcomeMessageForm.message}
                        >
                          <FeatherIcon icon="plus" size={16} />
                          {' '}Add Message
                        </Button>
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
              <hr />
              <h5>Saved Welcome Messages</h5>
              {formData.welcomeMessages.length === 0 ? (
                <div className="text-center p-3 bg-light rounded">
                  <FeatherIcon icon="info" size={18} />
                  <p className="mb-0">No welcome messages defined yet.</p>
                </div>
              ) : (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th style={{width: "20%"}}>Role</th>
                      <th style={{width: "65%"}}>Message</th>
                      <th style={{width: "15%"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.welcomeMessages.map((msg, index) => (
                      <tr key={index}>
                        <td>{msg.role}</td>
                        <td>{msg.message}</td>
                        <td className="text-center">
                          <Button color="info" size="sm" className="me-1" onClick={() => editWelcomeMessage(index)}>
                            <FeatherIcon icon="edit" size={14} />
                          </Button>
                          <Button color="danger" size="sm" onClick={() => removeWelcomeMessage(index)}>
                            <FeatherIcon icon="trash-2" size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabPane>
          </TabContent>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>Cancel</Button>
        <Button 
          color="primary" 
          onClick={handleSubmit}
          disabled={actionInProgress || !formData.version}
        >
          {actionInProgress ? (
            <><Spinner size="sm" /> Saving...</>
          ) : (
            isEditing ? 'Update Configuration' : 'Create Configuration'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AssistantConfigModal;