import React, { useState, useEffect } from 'react';
import {
  Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Button,
  Row, Col, ListGroup, ListGroupItem, Badge, Modal, ModalHeader,
  ModalBody, ModalFooter, Alert
} from 'reactstrap';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next'; // Import translation hook
import "./poll.css";

const PollCreator = ({ eventId, showStart, onPollCreated }) => {
  // Initialize translation hook
  const { t } = useTranslation();
  
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New poll form state
  const [newPollModal, setNewPollModal] = useState(false);
  const [editPollModal, setEditPollModal] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(null);

  const [pollForm, setPollForm] = useState({
    title: '',
    description: '',
    questions: [
      {
        title: '',
        description: '',
        options: ['', '']
      }
    ],
    questionDuration: 60,
    pauseDuration: 5
  });

  useEffect(() => {
    if (eventId) {
      fetchPolls();
    }
  }, [eventId]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/polls/events/${eventId}/polls`);
      console.log('Fetched polls:', response.data);
      setPolls(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching polls:', err);
      setError(t('pollManagement.errors.fetchFailed'));
      toast.error(t('pollManagement.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Add a question to the form
  const addQuestion = () => {
    setPollForm({
      ...pollForm,
      questions: [
        ...pollForm.questions,
        {
          title: '',
          description: '',
          options: ['', '']
        }
      ]
    });
  };

  // Remove a question
  const removeQuestion = (index) => {
    if (pollForm.questions.length <= 1) {
      toast.error(t('pollManagement.errors.questionMin'));
      return;
    }

    const updatedQuestions = [...pollForm.questions];
    updatedQuestions.splice(index, 1);

    setPollForm({
      ...pollForm,
      questions: updatedQuestions
    });
  };

  // Handle question field changes
  const handleQuestionChange = (questionIndex, field, value) => {
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions[questionIndex][field] = value;

    setPollForm({
      ...pollForm,
      questions: updatedQuestions
    });
  };

  // Handle option changes for a specific question
  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;

    setPollForm({
      ...pollForm,
      questions: updatedQuestions
    });
  };

  // Add option to a specific question
  const addOption = (questionIndex) => {
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions[questionIndex].options.push('');

    setPollForm({
      ...pollForm,
      questions: updatedQuestions
    });
  };

  // Remove option from a specific question
  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...pollForm.questions];
    if (updatedQuestions[questionIndex].options.length <= 2) {
      toast.error(t('pollManagement.errors.optionMin'));
      return;
    }

    updatedQuestions[questionIndex].options.splice(optionIndex, 1);

    setPollForm({
      ...pollForm,
      questions: updatedQuestions
    });
  };

  const handleInputChange = (e) => {
    setPollForm({
      ...pollForm,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setPollForm({
      title: '',
      description: '',
      questions: [
        {
          title: '',
          description: '',
          options: ['', '']
        }
      ],
      questionDuration: 60,
      pauseDuration: 5
    });
  };

  const toggleNewPollModal = () => {
    setNewPollModal(!newPollModal);
    if (!newPollModal) {
      resetForm();
    }
  };

  const toggleEditPollModal = (poll = null) => {
    if (poll) {
      // Transform the poll data structure to match our form
      const questions = poll.questions
        ? poll.questions.map(q => ({
          title: q.title,
          description: q.description || '',
          options: q.options.map(opt => opt.text)
        }))
        : [{
          title: poll.title,
          description: poll.description || '',
          options: poll.options.map(opt => opt.text)
        }];

      setPollForm({
        title: poll.title,
        description: poll.description || '',
        questions: questions,
        questionDuration: poll.questionDuration || poll.duration || 60,
        pauseDuration: poll.pauseDuration || 5
      });
      setCurrentPoll(poll);
    } else {
      resetForm();
      setCurrentPoll(null);
    }
    setEditPollModal(!editPollModal);
  };

  // Update the createPoll function
  const createPoll = async (e) => {
    e.preventDefault();

    // Validate form
    if (!pollForm.title.trim()) {
      toast.error(t('pollManagement.errors.titleRequired'));
      return;
    }

    // Validate questions
    const validQuestions = pollForm.questions.filter(q =>
      q.title.trim() &&
      q.options.filter(opt => opt.trim()).length >= 2
    );

    if (validQuestions.length === 0) {
      toast.error(t('pollManagement.errors.questionValidation'));
      return;
    }

    try {
      // Format questions for API - this is the key change
      const formattedQuestions = pollForm.questions.map((q, index) => ({
        title: q.title,
        description: q.description,
        // Just send the text strings, not objects with text properties
        options: q.options.filter(opt => opt.trim()),
        order: index + 1
      }));

      const newPoll = {
        eventId,
        title: pollForm.title,
        description: pollForm.description,
        questions: formattedQuestions,
        questionDuration: parseInt(pollForm.questionDuration, 10) || 60,
        pauseDuration: parseInt(pollForm.pauseDuration, 10) || 5
      };

      console.log('Sending poll data:', JSON.stringify(newPoll, null, 2));

      const response = await api.post('/api/polls', newPoll);
      setPolls([...polls, response.data]);
      toggleNewPollModal();
      toast.success(t('pollManagement.success.created'));
      
      // Call the onPollCreated callback if provided
      if (onPollCreated && typeof onPollCreated === 'function') {
        onPollCreated();
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      toast.error(`${t('pollManagement.errors.createFailed')}: ${err.response?.data?.message || err.message}`);
    }
  };

  // Similar update for updatePoll function
  const updatePoll = async (e) => {
    e.preventDefault();

    if (!currentPoll) return;

    // Validate form
    if (!pollForm.title.trim()) {
      toast.error(t('pollManagement.errors.titleRequired'));
      return;
    }

    // Validate questions
    const validQuestions = pollForm.questions.filter(q =>
      q.title.trim() &&
      q.options.filter(opt => opt.trim()).length >= 2
    );

    if (validQuestions.length === 0) {
      toast.error(t('pollManagement.errors.questionValidation'));
      return;
    }

    try {
      // Format questions for API - this is the key change
      const formattedQuestions = pollForm.questions.map((q, index) => ({
        title: q.title,
        description: q.description,
        // Just send the text strings, not objects with text properties
        options: q.options.filter(opt => opt.trim()),
        order: index + 1
      }));

      const updatedPoll = {
        title: pollForm.title,
        description: pollForm.description,
        questions: formattedQuestions,
        questionDuration: parseInt(pollForm.questionDuration, 10) || 60,
        pauseDuration: parseInt(pollForm.pauseDuration, 10) || 5
      };

      const response = await api.put(`/api/polls/${currentPoll._id}`, updatedPoll);

      setPolls(polls.map(poll =>
        poll._id === currentPoll._id ? response.data : poll
      ));

      toggleEditPollModal();
      toast.success(t('pollManagement.success.updated'));
    } catch (err) {
      console.error('Error updating poll:', err);
      toast.error(`${t('pollManagement.errors.updateFailed')}: ${err.response?.data?.message || err.message}`);
    }
  };

  const deletePoll = async (id) => {
    if (!window.confirm(t('pollManagement.confirmations.delete'))) {
      return;
    }

    try {
      console.log('Deleting poll with ID:', id);
      await api.delete(`/api/polls/${id}`);
      setPolls(polls.filter(poll => poll._id !== id));
      toast.success(t('pollManagement.success.deleted'));
    } catch (err) {
      console.error('Error deleting poll:', err.response || err);
      toast.error(err.response?.data?.message || t('pollManagement.errors.deleteFailed'));
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(polls);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order property for each poll
    const updatedItems = items.map((poll, index) => ({
      ...poll,
      order: index + 1
    }));

    setPolls(updatedItems);

    // Update the order in the database for each poll
    try {
      for (const poll of updatedItems) {
        await api.put(`/api/polls/${poll._id}`, { order: poll.order });
      }
    } catch (err) {
      console.error('Error updating poll order:', err);
      toast.error(t('pollManagement.errors.reorderFailed'));
      // Revert to original order if update fails
      fetchPolls();
    }
  };


  // In the startPoll function:
  const startPoll = async (pollId) => {
    try {
      console.log(`Starting poll ${pollId}`);

      // Use the centralized startPoll function
      await import('../../services/pollsocketmanager')
        .then(module => module.startPoll(pollId));

      // Always refresh polls to get updated status
      fetchPolls();
    } catch (err) {
      console.error('Error starting poll:', err);
      toast.error(t('pollManagement.errors.startFailed'));
    }
  };

  if (loading) {
    return <div className="text-center my-4">{t('pollManagement.loading')}</div>;
  }

  if (error) {
    return (
      <Alert color="danger" className="my-4">
        {error}
        <Button color="link" onClick={fetchPolls}>{t('pollManagement.tryAgain')}</Button>
      </Alert>
    );
  }

  return (
    <div className="poll-creator-container">
      <Card className="nestly-card mb-4">
        <CardHeader className="nestly-card-header d-flex justify-content-between align-items-center">
          <div className="nestly-card-pattern"></div>
          <div className="d-flex align-items-center">
            <i className="ri-question-answer-line me-2 fs-4"></i>
            <h5 className="poll-title mb-0">{t('pollManagement.title')}</h5>
          </div>
          <div>
            <Button className="nestly-btn-coral" size="sm" onClick={toggleNewPollModal}>
              <i className="ri-add-line me-1"></i> {t('pollManagement.buttons.create')}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {polls.length === 0 ? (
            <div className="text-center py-4">
              <div className="mb-3">
                <div className="nestly-icon-container nestly-icon-container-teal mx-auto">
                  <i className="ri-questionnaire-line fs-3"></i>
                </div>
              </div>
              <h5 className="poll-subtitle mb-3">{t('pollManagement.emptyState.title')}</h5>
              <p className="text-muted mb-4">{t('pollManagement.emptyState.description')}</p>
              <Button className="nestly-btn-teal" onClick={toggleNewPollModal}>
                <i className="ri-add-line me-1"></i> {t('pollManagement.buttons.createFirst')}
              </Button>
            </div>
          ) : (
            <>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="polls">
                  {(provided) => (
                    <ListGroup {...provided.droppableProps} ref={provided.innerRef}>
                      {polls.map((poll, index) => (
                        <Draggable key={poll._id} draggableId={poll._id} index={index}>
                          {(provided) => (
                            <ListGroupItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="nestly-list-item d-flex flex-column justify-content-between align-items-start"
                            >
                              <div className="w-100">
                                <div className="d-flex align-items-center">
                                  <div className="nestly-badge nestly-badge-teal me-2">
                                    {index + 1}
                                  </div>
                                  <h6 className="mb-0" color='black'>{poll.title}</h6>

                                  {poll.status === 'active' && (
                                    <span className="nestly-badge nestly-badge-coral ms-2">
                                      {t('pollManagement.status.active')}
                                    </span>
                                  )}
                                  {poll.status === 'completed' && (
                                    <span className="nestly-badge nestly-badge-navy ms-2">
                                      {t('pollManagement.status.completed')}
                                    </span>
                                  )}
                                </div>
                                <small className="text-muted d-block mt-1">
                                  <i className="ri-questionnaire-line me-1"></i>
                                  {poll.questions ?
                                    t('pollManagement.questionCount', { 
                                      count: poll.questions.length 
                                    }) :
                                    t('pollManagement.optionCount', { 
                                      count: poll.options?.length || 0 
                                    })} •
                                  <i className="ri-time-line ms-2 me-1"></i>
                                  {t('pollManagement.duration', { 
                                    seconds: poll.questionDuration || poll.duration 
                                  })}
                                </small>
                              </div>
                              <div className="w-100 d-flex justify-content-end align-items-center mt-3">
                                {poll.status === 'pending' && showStart && (
                                  <Button
                                    color="success"
                                    className="me-2"
                                    size="sm"
                                    onClick={() => startPoll(poll._id)}
                                  >
                                    <i className="ri-play-fill me-1"></i> {t('pollManagement.buttons.start')}
                                  </Button>
                                )}
                                <Button
                                  color="secondary"
                                  className="me-2"
                                  size="sm"
                                  onClick={() => toggleEditPollModal(poll)}
                                  disabled={poll.status !== 'pending'}
                                >
                                  <i className="ri-edit-line me-1"></i> {t('pollManagement.buttons.edit')}
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => deletePoll(poll._id)}
                                  disabled={poll.status !== 'pending'}
                                >
                                  <i className="ri-delete-bin-line me-1"></i> {t('pollManagement.buttons.delete')}
                                </Button>
                              </div>
                            </ListGroupItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ListGroup>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}
        </CardBody>
      </Card>

      {/* New Poll Modal */}
      <Modal isOpen={newPollModal} toggle={toggleNewPollModal} size="lg">
        <ModalHeader toggle={toggleNewPollModal} className="border-0">
          <div className="d-flex align-items-center">
            <div className="nestly-icon-container nestly-icon-container-teal">
              <i className="ri-questionnaire-line"></i>
            </div>
            <h5 className="poll-title mb-0">{t('pollManagement.modals.create.title')}</h5>
          </div>
        </ModalHeader>
        <Form onSubmit={createPoll}>
          <ModalBody>
            <FormGroup>
              <Label for="title" className="poll-subtitle">{t('pollManagement.form.title')}</Label>
              <Input
                type="text"
                name="title"
                id="title"
                placeholder={t('pollManagement.form.titlePlaceholder')}
                value={pollForm.title}
                onChange={handleInputChange}
                required
                className="nestly-input"
              />
            </FormGroup>

            <FormGroup>
              <Label for="description" className="poll-subtitle">{t('pollManagement.form.description')}</Label>
              <Input
                type="textarea"
                name="description"
                id="description"
                placeholder={t('pollManagement.form.descriptionPlaceholder')}
                value={pollForm.description}
                onChange={handleInputChange}
                rows="2"
                className="nestly-input"
              />
            </FormGroup>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="questionDuration" className="poll-subtitle">
                    <i className="ri-time-line me-1"></i> {t('pollManagement.form.questionDuration')}
                  </Label>
                  <Input
                    type="number"
                    name="questionDuration"
                    id="questionDuration"
                    min="10"
                    max="300"
                    value={pollForm.questionDuration}
                    onWheel={e => e.target.blur()} // Prevent scroll from changing value
                    onChange={handleInputChange}
                    required
                    className="nestly-input"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="pauseDuration" className="poll-subtitle">
                    <i className="ri-pause-mini-line me-1"></i> {t('pollManagement.form.pauseDuration')}
                  </Label>
                  <Input
                    type="number"
                    name="pauseDuration"
                    id="pauseDuration"
                    min="1"
                    max="60"
                    value={pollForm.pauseDuration}
                    onChange={handleInputChange}
                    onWheel={e => e.target.blur()} // Prevent scroll from changing value
                    required
                    className="nestly-input"
                  />
                </FormGroup>
              </Col>
            </Row>

            <hr />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="poll-title mb-0">{t('pollManagement.form.questions')}</h5>
              <Button
                color='danger'
                size="sm"
                onClick={addQuestion}
                type="button"
              >
                <i className="ri-add-line me-1"></i> {t('pollManagement.buttons.addQuestion')}
              </Button>
            </div>

            {pollForm.questions.map((question, qIndex) => (
              <Card key={qIndex} className="nestly-question-card mb-4">
                <CardHeader className="nestly-question-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0"><i className="ri-question-line me-1"></i> {t('pollManagement.form.questionNumber', { number: qIndex + 1 })}</h6>
                  {pollForm.questions.length > 1 && (
                    <Button
                      color='danger'
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </Button>
                  )}
                </CardHeader>
                <CardBody>
                  <FormGroup>
                    <Label className="poll-subtitle">{t('pollManagement.form.questionText')}</Label>
                    <Input
                      type="text"
                      placeholder={t('pollManagement.form.questionTextPlaceholder')}
                      value={question.title}
                      onChange={e => handleQuestionChange(qIndex, 'title', e.target.value)}
                      required
                      className="nestly-input"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="poll-subtitle">{t('pollManagement.form.questionDescription')}</Label>
                    <Input
                      type="textarea"
                      placeholder={t('pollManagement.form.questionDescriptionPlaceholder')}
                      value={question.description}
                      onChange={e => handleQuestionChange(qIndex, 'description', e.target.value)}
                      rows="2"
                      className="nestly-input"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="poll-subtitle">
                      <i className="ri-list-check me-1"></i> {t('pollManagement.form.options')}
                    </Label>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="d-flex mb-2">
                        <Input
                          type="text"
                          placeholder={t('pollManagement.form.optionPlaceholder', { number: oIndex + 1 })}
                          value={option}
                          onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                          required
                          className="nestly-input"
                        />
                        <Button
                          className="nestly-btn-outline-coral ms-2"
                          color="danger"
                          size="sm"
                          onClick={() => removeOption(qIndex, oIndex)}
                          disabled={question.options.length <= 2}
                        >
                          <i className="ri-close-line"></i>
                        </Button>
                      </div>
                    ))}

                    <Button
                      size="sm"
                      color='danger'
                      onClick={() => addOption(qIndex)}
                      type="button"
                    >
                      <i className="ri-add-line me-1"></i> {t('pollManagement.buttons.addOption')}
                    </Button>
                  </FormGroup>
                </CardBody>
              </Card>
            ))}
          </ModalBody>
          <ModalFooter>
            <Button color="danger" onClick={toggleNewPollModal} type="button">
              {t('pollManagement.buttons.cancel')}
            </Button>
            <Button color='success' type="submit">
              <i className="ri-save-line me-1"></i> {t('pollManagement.buttons.createPoll')}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Edit Poll Modal */}
      <Modal isOpen={editPollModal} toggle={() => toggleEditPollModal()} size="lg">
        <ModalHeader toggle={() => toggleEditPollModal()} className="border-0">
          <div className="d-flex align-items-center">
            <div className="nestly-icon-container nestly-icon-container-teal">
              <i className="ri-edit-line"></i>
            </div>
            <h5 className="poll-title mb-0">{t('pollManagement.modals.edit.title')}</h5>
          </div>
        </ModalHeader>
        <Form onSubmit={updatePoll}>
          <ModalBody>
            <FormGroup>
              <Label for="title" className="poll-subtitle">{t('pollManagement.form.title')}</Label>
              <Input
                type="text"
                name="title"
                id="title"
                placeholder={t('pollManagement.form.titlePlaceholder')}
                value={pollForm.title}
                onChange={handleInputChange}
                required
                className="nestly-input"
              />
            </FormGroup>

            <FormGroup>
              <Label for="description" className="poll-subtitle">{t('pollManagement.form.description')}</Label>
              <Input
                type="textarea"
                name="description"
                id="description"
                placeholder={t('pollManagement.form.descriptionPlaceholder')}
                value={pollForm.description}
                onChange={handleInputChange}
                rows="2"
                className="nestly-input"
              />
            </FormGroup>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="questionDuration" className="poll-subtitle">
                    <i className="ri-time-line me-1"></i> {t('pollManagement.form.questionDuration')}
                  </Label>
                  <Input
                    type="number"
                    name="questionDuration"
                    id="questionDuration"
                    min="10"
                    max="300"
                    value={pollForm.questionDuration}
                    onChange={handleInputChange}
                    required
                    className="nestly-input"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="pauseDuration" className="poll-subtitle">
                    <i className="ri-pause-mini-line me-1"></i> {t('pollManagement.form.pauseDuration')}
                  </Label>
                  <Input
                    type="number"
                    name="pauseDuration"
                    id="pauseDuration"
                    min="1"
                    max="60"
                    value={pollForm.pauseDuration}
                    onChange={handleInputChange}
                    required
                    className="nestly-input"
                    onWheel={e => e.target.blur()} // Prevent scroll from changing value
                  />
                </FormGroup>
              </Col>
            </Row>

            <hr />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="poll-title mb-0">{t('pollManagement.form.questions')}</h5>
              <Button
                className="nestly-btn-outline-teal"
                size="sm"
                onClick={addQuestion}
                type="button"
              >
                <i className="ri-add-line me-1"></i> {t('pollManagement.buttons.addQuestion')}
              </Button>
            </div>

            {pollForm.questions.map((question, qIndex) => (
              <Card key={qIndex} className="nestly-question-card mb-4">
                <CardHeader className="nestly-question-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0"><i className="ri-question-line me-1"></i> {t('pollManagement.form.questionNumber', { number: qIndex + 1 })}</h6>
                  {pollForm.questions.length > 1 && (
                    <Button
                      className="nestly-btn-outline-coral"
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </Button>
                  )}
                </CardHeader>
                <CardBody>
                  <FormGroup>
                    <Label className="poll-subtitle">{t('pollManagement.form.questionText')}</Label>
                    <Input
                      type="text"
                      placeholder={t('pollManagement.form.questionTextPlaceholder')}
                      value={question.title}
                      onChange={e => handleQuestionChange(qIndex, 'title', e.target.value)}
                      required
                      className="nestly-input"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="poll-subtitle">{t('pollManagement.form.questionDescription')}</Label>
                    <Input
                      type="textarea"
                      placeholder={t('pollManagement.form.questionDescriptionPlaceholder')}
                      value={question.description}
                      onChange={e => handleQuestionChange(qIndex, 'description', e.target.value)}
                      rows="2"
                      className="nestly-input"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="poll-subtitle">
                      <i className="ri-list-check me-1"></i> {t('pollManagement.form.options')}
                    </Label>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="d-flex mb-2">
                        <Input
                          type="text"
                          placeholder={t('pollManagement.form.optionPlaceholder', { number: oIndex + 1 })}
                          value={option}
                          onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                          required
                          className="nestly-input"
                        />
                        <Button
                          className="nestly-btn-outline-coral ms-2"
                          size="sm"
                          onClick={() => removeOption(qIndex, oIndex)}
                          disabled={question.options.length <= 2}
                        >
                          <i className="ri-close-line"></i>
                        </Button>
                      </div>
                    ))}

                    <Button
                      className="nestly-btn-outline-teal mt-2"
                      size="sm"
                      onClick={() => addOption(qIndex)}
                      type="button"
                    >
                      <i className="ri-add-line me-1"></i> {t('pollManagement.buttons.addOption')}
                    </Button>
                  </FormGroup>
                </CardBody>
              </Card>
            ))}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => toggleEditPollModal()} type="button">
              {t('pollManagement.buttons.cancel')}
            </Button>
            <Button className="nestly-btn-teal" type="submit">
              <i className="ri-save-line me-1"></i> {t('pollManagement.buttons.updatePoll')}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default PollCreator;