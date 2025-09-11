import React, { useState, useEffect } from 'react';
import { Button, Form, FormGroup, Label, Input, Row, Col, Spinner, Card, CardBody } from 'reactstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../../services/api';

const PollCreatorsingle = ({ eventId, showStart = true, onPollCreated, isStandalone = false, buildingId }) => {
  const { t } = useTranslation();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPollModal, setNewPollModal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    questionDuration: '60',
    pauseDuration: '5'
  });

  const fetchPolls = async () => {
    setLoading(true);
    try {
      let response;
      if (isStandalone) {
        if (!buildingId) {
          throw new Error('Building ID is required for standalone polls');
        }
        response = await api.get(`/api/polls/building/${buildingId}/standalone`);
      } else {
        response = await api.get(`/api/polls/events/${eventId}/polls`);
      }
      setPolls(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching polls:', err);
      setError(t('pollManagementsingle.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && eventId !== 'standalone') {
      fetchPolls();
    }
    if (isStandalone && buildingId) {
      fetchPolls();
    }
  }, [eventId, isStandalone, buildingId]);

  const toggleNewPollModal = () => setNewPollModal(prev => !prev);


  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPollForm(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions[index][field] = value;
    setPollForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setPollForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions[questionIndex].options.push('');
    setPollForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...pollForm.questions];
    if (updatedQuestions[questionIndex].options.length <= 2) {
      toast.error(t('pollManagementsingle.errors.minimumTwoOptions'));
      return;
    }
    updatedQuestions[questionIndex].options.splice(optionIndex, 1);
    setPollForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const addQuestion = () => {
    setPollForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          title: '',
          description: '',
          options: ['', '']
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    if (pollForm.questions.length <= 1) {
      toast.error(t('pollManagementsingle.errors.minimumOneQuestion'));
      return;
    }
    const updatedQuestions = [...pollForm.questions];
    updatedQuestions.splice(index, 1);
    setPollForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const createPoll = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (!pollForm.title.trim()) {
        toast.error(t('pollManagementsingle.errors.titleRequired'));
        setIsSubmitting(false);
        return;
      }

      // Check each question
      const validQuestions = pollForm.questions.filter(q => {
        // Question must have a title
        if (!q.title.trim()) return false;
        
        // Question must have at least 2 non-empty options
        const nonEmptyOptions = q.options.filter(opt => opt.trim());
        return nonEmptyOptions.length >= 2;
      });

      if (validQuestions.length !== pollForm.questions.length) {
        toast.error(t('pollManagementsingle.errors.invalidQuestions'));
        setIsSubmitting(false);
        return;
      }

      let response;
      
      if (isStandalone) {
        // Create standalone poll
        response = await api.post('/api/polls/standalone', {
          title: pollForm.title,
          description: pollForm.description,
          questions: pollForm.questions,
          questionDuration: parseInt(pollForm.questionDuration, 10),
          pauseDuration: parseInt(pollForm.pauseDuration, 10),
          building: buildingId
        });
      } else {
        // Create regular event poll
        response = await api.post('/api/polls', {
          eventId,
          title: pollForm.title,
          description: pollForm.description,
          questions: pollForm.questions,
          questionDuration: parseInt(pollForm.questionDuration, 10),
          pauseDuration: parseInt(pollForm.pauseDuration, 10)
        });
      }
      
      setPolls([...polls, response.data]);
      toggleNewPollModal();
      toast.success(t('pollManagementsingle.success.created'));
      
      if (onPollCreated && typeof onPollCreated === 'function') {
        onPollCreated();
      }
      
    } catch (err) {
      console.error('Error creating poll:', err);
      toast.error(t('pollManagementsingle.errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPoll = async (pollId) => {
    try {
      await api.post(`/api/polls/${pollId}/start`);
      toast.success(t('pollManagementsingle.success.started'));
      fetchPolls();
    } catch (err) {
      console.error('Error starting poll:', err);
      toast.error(t('pollManagementsingle.errors.startFailed'));
    }
  };

  const deletePoll = async (pollId) => {
    if (window.confirm(t('pollManagementsingle.confirmDelete'))) {
      try {
        await api.delete(`/api/polls/${pollId}`);
        toast.success(t('pollManagementsingle.success.deleted'));
        setPolls(polls.filter(poll => poll._id !== pollId));
      } catch (err) {
        console.error('Error deleting poll:', err);
        toast.error(t('pollManagementsingle.errors.deleteFailed'));
      }
    }
  };

  if (loading && !polls.length) {
    return (
      <div className="text-center p-4">
        <Spinner color="primary" />
        <p>{t('pollManagementsingle.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div>

      {/* Create Poll Form Modal */}
      {newPollModal && (
        <div className="poll-form-container p-4 border rounded">
          <h5 className="mb-4">{t('pollManagementsingle.createNewPoll')}</h5>
          <Form onSubmit={createPoll}>
            <FormGroup>
              <Label for="title">{t('pollManagementsingle.title')}</Label>
              <Input
                type="text"
                id="title"
                name="title"
                value={pollForm.title}
                onChange={handleFormChange}
                placeholder={t('pollManagementsingle.titlePlaceholder')}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label for="description">{t('pollManagementsingle.description')}</Label>
              <Input
                type="textarea"
                id="description"
                name="description"
                value={pollForm.description}
                onChange={handleFormChange}
                placeholder={t('pollManagementsingle.descriptionPlaceholder')}
                rows="3"
              />
            </FormGroup>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="questionDuration">{t('pollManagementsingle.questionDuration')}</Label>
                  <Input
                    type="number"
                    id="questionDuration"
                    name="questionDuration"
                    value={pollForm.questionDuration}
                    onChange={handleFormChange}
                    min="10"
                    placeholder="60"
                  />
                  <small className="text-muted">{t('pollManagementsingle.secondsPerQuestion')}</small>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="pauseDuration">{t('pollManagementsingle.pauseDuration')}</Label>
                  <Input
                    type="number"
                    id="pauseDuration"
                    name="pauseDuration"
                    value={pollForm.pauseDuration}
                    onChange={handleFormChange}
                    min="2"
                    placeholder="5"
                  />
                  <small className="text-muted">{t('pollManagementsingle.secondsBetweenQuestions')}</small>
                </FormGroup>
              </Col>
            </Row>

            <h6 className="mt-4 mb-3">{t('pollManagementsingle.questions')}</h6>

            {pollForm.questions.map((question, questionIndex) => (
              <Card key={questionIndex} className="mb-3 border">
                <CardBody>
                  <div className="d-flex justify-content-between mb-3">
                    <h6>{t('pollManagementsingle.questionNumber', { number: questionIndex + 1 })}</h6>
                    {pollForm.questions.length > 1 && (
                      <Button 
                        color="danger" 
                        size="sm" 
                        outline
                        onClick={() => removeQuestion(questionIndex)}
                      >
                        <i className="ri-delete-bin-line"></i>
                      </Button>
                    )}
                  </div>

                  <FormGroup>
                    <Label>{t('pollManagementsingle.questionTitle')}</Label>
                    <Input
                      type="text"
                      value={question.title}
                      onChange={(e) => handleQuestionChange(questionIndex, 'title', e.target.value)}
                      placeholder={t('pollManagementsingle.questionTitlePlaceholder')}
                      required
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>{t('pollManagementsingle.questionDescription')}</Label>
                    <Input
                      type="textarea"
                      value={question.description}
                      onChange={(e) => handleQuestionChange(questionIndex, 'description', e.target.value)}
                      placeholder={t('pollManagementsingle.questionDescriptionPlaceholder')}
                      rows="2"
                    />
                  </FormGroup>

                  <Label>{t('pollManagementsingle.options')}</Label>

                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="d-flex mb-2">
                      <Input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                        placeholder={`${t('pollManagementsingle.option')} ${optionIndex + 1}`}
                        required
                        className="me-2"
                      />
                      {question.options.length > 2 && (
                        <Button 
                          color="danger" 
                          outline
                          onClick={() => removeOption(questionIndex, optionIndex)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button 
                    color="light" 
                    size="sm" 
                    onClick={() => addOption(questionIndex)} 
                    className="mt-2"
                  >
                    <i className="ri-add-line me-1"></i>
                    {t('pollManagementsingle.addOption')}
                  </Button>
                </CardBody>
              </Card>
            ))}

            <Button 
              color="light" 
              outline 
              onClick={addQuestion} 
              className="w-100 mb-3"
            >
              <i className="ri-add-line me-1"></i>
              {t('pollManagementsingle.addQuestion')}
            </Button>

            <div className="d-flex justify-content-end">
       
              <Button 
                color="primary" 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    {t('pollManagementsingle.creating')}
                  </>
                ) : (
                  t('pollManagementsingle.createPoll')
                )}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
};

export default PollCreatorsingle;