import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button, Nav, NavItem, NavLink, TabContent, TabPane, Row, Col, Card, CardBody, Input, FormGroup, Label, Badge, ListGroup, ListGroupItem, Spinner } from 'reactstrap';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import "./poll.css";

const EventPollManager = ({ eventId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('polls');
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    questions: [{ title: '', description: '', options: [{ text: '' }, { text: '' }] }],
    questionDuration: 60
  });


  const user = useSelector(state => state.Loginn.user);
  const isModerator = user?.role === 'SyndicateAdmin';
  // Add these new state variables near other state declarations
  const [editPollId, setEditPollId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  useEffect(() => {
    if (eventId) {
      fetchPolls();
    }
  }, [eventId]);

  // Add these new state variables at the top of your component
  const [page, setPage] = useState(1);
  const [pollsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);

  // Update the fetchPolls function to support pagination
  const fetchPolls = async () => {
    if (!eventId) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/api/polls/events/${eventId}/polls`);
      const allPolls = response.data || [];

      // Calculate total pages
      setTotalPages(Math.ceil(allPolls.length / pollsPerPage));

      // Set all polls for statistics
      setPolls(allPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to fetch polls');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this pagination helper function
  const getPaginatedPolls = () => {
    const startIndex = (page - 1) * pollsPerPage;
    const endIndex = startIndex + pollsPerPage;
    return polls.slice(startIndex, endIndex);
  };

  // Add a function to change pages
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleCreatePoll = async () => {
    if (!newPoll.title.trim()) {
      toast.warning('Please enter a poll title');
      return;
    }

    if (newPoll.questions.some(q => !q.title.trim())) {
      toast.warning('All questions must have titles');
      return;
    }

    if (newPoll.questions.some(q => q.options.some(o => !o.text.trim()))) {
      toast.warning('All options must have text');
      return;
    }

    setIsLoading(true);
    try {
      // Format questions properly to match working PollManagement.js structure
      const formattedQuestions = newPoll.questions.map((q, index) => ({
        title: q.title,
        description: q.description,
        // Convert the array of objects to array of strings
        options: q.options.map(opt => opt.text).filter(text => text.trim()),
        order: index + 1
      }));

      // Create the poll data using the structure that works in PollManagement.js
      const pollData = {
        eventId: eventId, // This is important - match the field name expected by the API
        title: newPoll.title,
        description: newPoll.description,
        questions: formattedQuestions,
        questionDuration: parseInt(newPoll.questionDuration) || 60,
        pauseDuration: 5
      };

      // Use the endpoint that works in PollManagement.js
      await api.post('/api/polls', pollData);
      toast.success('Poll created successfully');

      // Reset form and refresh polls
      setNewPoll({
        title: '',
        description: '',
        questions: [{ title: '', description: '', options: [{ text: '' }, { text: '' }] }],
        questionDuration: 60
      });
      fetchPolls();
      setActiveTab('polls');
    } catch (error) {
      console.error('Error creating poll:', error);

      // Better error handling
      if (error.response) {
        console.log('Server response:', error.response.data);
        toast.error(`Failed to create poll: ${error.response.data.message || error.response.statusText}`);
      } else {
        toast.error('Failed to create poll: Network error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deletePoll = async (pollId) => {
    try {
      await api.delete(`/api/polls/${pollId}`);
      toast.success('Poll deleted successfully');
      fetchPolls();
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Failed to delete poll');
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...newPoll.questions];
    updatedQuestions[index][field] = value;
    setNewPoll({ ...newPoll, questions: updatedQuestions });
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updatedQuestions = [...newPoll.questions];
    updatedQuestions[qIndex].options[oIndex].text = value;
    setNewPoll({ ...newPoll, questions: updatedQuestions });
  };

  const addOption = (qIndex) => {
    const updatedQuestions = [...newPoll.questions];
    updatedQuestions[qIndex].options.push({ text: '' });
    setNewPoll({ ...newPoll, questions: updatedQuestions });
  };

  const removeOption = (qIndex, oIndex) => {
    const updatedQuestions = [...newPoll.questions];
    if (updatedQuestions[qIndex].options.length > 2) {
      updatedQuestions[qIndex].options.splice(oIndex, 1);
      setNewPoll({ ...newPoll, questions: updatedQuestions });
    } else {
      toast.warning('A question must have at least 2 options');
    }
  };

  const addQuestion = () => {
    setNewPoll({
      ...newPoll,
      questions: [...newPoll.questions, { title: '', description: '', options: [{ text: '' }, { text: '' }] }]
    });
  };

  const removeQuestion = (index) => {
    if (newPoll.questions.length > 1) {
      const updatedQuestions = [...newPoll.questions];
      updatedQuestions.splice(index, 1);
      setNewPoll({ ...newPoll, questions: updatedQuestions });
    } else {
      toast.warning('You need at least one question');
    }
  };

  // Only show for the right users
  if (!eventId || (!isModerator && polls.length === 0)) {
    return null;
  }
  // Add the editPoll function
  const editPoll = (poll) => {
    setIsEditMode(true);
    setEditPollId(poll._id);

    // Format the poll data for the form
    const formattedQuestions = poll.questions ? poll.questions.map(q => ({
      title: q.title || '',
      description: q.description || '',
      options: q.options ? q.options.map(option => ({
        text: typeof option === 'string' ? option : option.text || ''
      })) : [{ text: '' }, { text: '' }]
    })) : [{ title: '', description: '', options: [{ text: '' }, { text: '' }] }];

    setNewPoll({
      title: poll.title || '',
      description: poll.description || '',
      questionDuration: poll.questionDuration || 60,
      questions: formattedQuestions
    });

    // Switch to create tab to edit
    setActiveTab('create');
  };


  return (
    <div className="event-poll-manager-section mt-3" >
      <h5 className="section-title d-flex align-items-center mb-3">
        <i className="ri-questionnaire-line me-2"></i>
        {t('pollManagement.form.interactivePolls')}
        {polls.length > 0 && (
          <Badge color="info" pill className="ms-2">
            {polls.length}
          </Badge>
        )}
      </h5>

      {isModerator ? (
        <>
          <Nav tabs className="nestly-tabs mb-3" >
            <NavItem>
              <NavLink
                className={activeTab === 'polls' ? 'active' : ''}
                onClick={() => setActiveTab('polls')}
              >
                <i className="ri-list-check me-1"></i>
                {t('pollManagement.form.managePollsTab')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'create' ? 'active' : ''}
                onClick={() => setActiveTab('create')}
              >
                <i className="ri-add-line me-1"></i>
                {t('pollManagement.form.createPollTab')}
              </NavLink>
            </NavItem>
          </Nav>

          <TabContent activeTab={activeTab}>
            <TabPane tabId="polls" >
              <div className="polls-container" style={{ marginTop: '10px' }}>
                {isLoading ? (
                  <div className="text-center py-4">
                    <Spinner size="sm" color="primary" />
                    <span className="ms-2">{t('pollManagement.loading')}</span>
                  </div>
                ) : polls.length === 0 ? (
                  <div className="text-center py-4 empty-state">
                    <i className="ri-questionnaire-line empty-icon"></i>
                    <p>{t('pollManagement.emptyState.title')}</p>
                    <Button
                      color="primary"
                      size="sm"
                      outline
                      onClick={() => setActiveTab('create')}
                    >
                      <i className="ri-add-line me-1"></i>
                      {t('pollManagement.buttons.create')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <ListGroup className="poll-list">
                      {getPaginatedPolls().map(poll => (
                        <ListGroupItem key={poll._id} className="poll-list-item">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="poll-item-title">{poll.title}</h6>
                              <div className="poll-item-meta">
                                <Badge
                                  bg={poll.status === 'active' ? 'success' :
                                    poll.status === 'completed' || poll.status === 'ended' ? 'primary' :
                                      'secondary'}
                                  pill
                                  className="me-2 text-white"
                                >
                                  {poll.status === 'active' ? t('pollManagement.status.active') :
                                    poll.status === 'completed' || poll.status === 'ended' ? t('pollManagement.status.completed') :
                                      t('pollManagement.status.draft')}
                                </Badge>

                                <small className="text-dark fw-medium">
                                  {poll.questions?.length || 1} question{(poll.questions?.length || 1) !== 1 ? 's' : ''}
                                  {poll.responses && poll.responses.length > 0 &&
                                    ` • ${poll.responses.length} response${poll.responses.length !== 1 ? 's' : ''}`}
                                </small>
                              </div>

                            </div>
                            <div className="poll-item-actions">
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => deletePoll(poll._id)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </Button>
                              
                            </div>
                          </div>
                        </ListGroupItem>
                      ))}
                    </ListGroup>

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <nav>
                          <ul className="pagination pagination-sm">
                            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => changePage(page - 1)}
                                disabled={page === 1}
                              >
                                <i className="ri-arrow-left-s-line"></i>
                              </button>
                            </li>

                            {[...Array(totalPages)].map((_, i) => (
                              <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => changePage(i + 1)}
                                >
                                  {i + 1}
                                </button>
                              </li>
                            ))}

                            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => changePage(page + 1)}
                                disabled={page === totalPages}
                              >
                                <i className="ri-arrow-right-s-line"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}
                  </>
                )}
              </div>

            </TabPane>

            <TabPane tabId="create">
              <div className="create-poll-container">
                <div className="questions-container" style={{ marginTop: '20px' }}>

                  <FormGroup>
                    <Label for="pollTitle">{t('pollManagement.form.title')}</Label>
                    <Input
                      id="pollTitle"
                      value={newPoll.title}
                      onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                      placeholder={t('pollManagement.form.titlePlaceholder')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label for="pollDescription">{t('pollManagement.form.description')}</Label>
                    <Input
                      id="pollDescription"
                      type="textarea"
                      value={newPoll.description}
                      onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                      placeholder={t('pollManagement.form.descriptionPlaceholder')}
                      rows="2"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label for="questionDuration">{t('pollManagement.form.questionDuration')}</Label>
                    <Input
                      id="questionDuration"
                      type="number"
                      value={newPoll.questionDuration}
                      onChange={(e) => setNewPoll({ ...newPoll, questionDuration: parseInt(e.target.value) || 60 })}
                      min="10"
                      max="300"
                    />
                  </FormGroup>

                  {newPoll.questions.map((question, qIndex) => (
                    <Card key={qIndex} className="nestly-card mb-3 question-card">
                      <CardBody>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="question-number">{t('pollManagement.form.questionNumber', { number: qIndex + 1 })}</h6>
                          <Button
                            color="danger"
                            size="sm"
                            outline
                            onClick={() => removeQuestion(qIndex)}
                            disabled={newPoll.questions.length <= 1}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </Button>

                        </div>

                        <FormGroup>
                          <Label>{t('pollManagement.form.questionTitle')}</Label>
                          <Input
                            value={question.title}
                            onChange={(e) => handleQuestionChange(qIndex, 'title', e.target.value)}
                            placeholder={t('pollManagement.form.questionTitlePlaceholder')}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>{t('pollManagement.form.questionDescription')}</Label>
                          <Input
                            type="textarea"
                            value={question.description}
                            onChange={(e) => handleQuestionChange(qIndex, 'description', e.target.value)}
                            placeholder={t('pollManagement.form.questionDescriptionPlaceholder')}
                            rows="2"
                          />
                        </FormGroup>

                        <Label>{t('pollManagement.form.answerOptions')}</Label>
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="d-flex mb-2 align-items-center">
                            <Input
                              value={option.text}
                              onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                              placeholder={t('pollManagement.form.optionPlaceholder', { number: oIndex + 1 })}
                              className="me-2"
                            />
                            {question.options.length > 2 && (
                              <Button
                                color="light"
                                size="sm"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </Button>
                            )}

                          </div>
                        ))}

                        <Button
                          color="light"
                          size="sm"
                          onClick={() => addOption(qIndex)}
                          className="mt-2"
                        >
                          <i className="ri-add-line me-1"></i>
                          {t('pollManagement.buttons.addOption')}
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                <div className="d-flex mb-3">
                  <Button
                    color="secondary"
                    outline
                    onClick={addQuestion}
                    className="me-2"
                  >
                    <i className="ri-add-line me-1"></i>
                    {t('pollManagement.buttons.addQuestion')}
                  </Button>

                  <Button
                    color="primary"
                    onClick={handleCreatePoll}
                    disabled={isLoading}
                    className="ms-auto"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        {t('pollManagement.form.creating')}
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-1"></i>
                        {t('pollManagement.buttons.createPoll')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabPane>
          </TabContent>
        </>
      ) : (
        // For non-admin users, just show polls
        <div className="poll-participant-view">
          {isLoading ? (
            <div className="text-center py-3">
              <Spinner size="sm" color="primary" />
              <span className="ms-2">{t('pollManagement.loading')}</span>
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-muted mb-0">{t('pollManagement.form.noPollsYet')}</p>
            </div>
          ) : (
            <div className="poll-stats-summary">
              <Row>
                <Col xs={4}>
                  <div className="poll-stat-box">
                    <div className="poll-stat-value">{polls.length}</div>
                    <div className="poll-stat-label">{t('pollManagement.form.totalPolls')}</div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="poll-stat-box active">
                    <div className="poll-stat-value">
                      {polls.filter(p => p.status === 'active').length}
                    </div>
                    <div className="poll-stat-label">{t('pollManagement.form.active')}</div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="poll-stat-box completed">
                    <div className="poll-stat-value">
                      {polls.filter(p => p.status === 'completed' || p.status === 'ended').length}
                    </div>
                    <div className="poll-stat-label">{t('pollManagement.form.completed')}</div>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventPollManager;