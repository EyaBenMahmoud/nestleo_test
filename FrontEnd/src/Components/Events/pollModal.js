import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, ModalHeader, ModalBody, ModalFooter, Button, Progress,
    ListGroup, ListGroupItem, Badge
} from 'reactstrap';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setShowPollModal, incrementLiveVotesUpdate } from '../../slices/poll/slice';
import { initializeSocket } from '../../services/socketManager';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './poll.css';

const PollModal = ({ isModerator, eventId }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { activePoll, showPollModal, pollKey } = useSelector(state => state.polls);
    const user = useSelector(state => state.Loginn.user);

    // Internal poll state
    const [currentPoll, setCurrentPoll] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [voted, setVoted] = useState({});
    const [selectedOptions, setSelectedOptions] = useState({});
    const [showResultsState, setShowResultsState] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allQuestionsCompleted, setAllQuestionsCompleted] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [votedParticipants, setVotedParticipants] = useState(0);
    const [forceShowResults, setForceShowResults] = useState(false);
    const [pollStatus, setPollStatus] = useState('voting');
    const [pollEnded, setPollEnded] = useState(false);

    // References for timers and audio
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const socketRef = useRef(null);
    const toastsRef = useRef({});
    const votedPollsRef = useRef(new Set());

    // Toggle poll modal
    const togglePollModal = () => {
        if (user.role === 'SyndicateAdmin' && currentPoll &&
            Object.keys(voted).length > 0) {
            votedPollsRef.current.add(currentPoll._id);
        }
        dispatch(setShowPollModal(!showPollModal));
    };

    // Update the useEffect for activePoll to preserve question index for in-progress polls
    useEffect(() => {
        if (activePoll) {
            // Check if it's a new poll or the same one
            const isNewPoll = !currentPoll || currentPoll._id !== activePoll._id;

            // Always update the current poll reference
            setCurrentPoll(activePoll);

            // Only reset question index if it's a new poll
            if (isNewPoll) {
                setCurrentQuestionIndex(0);
                setVoted({});
                setSelectedOptions({});
                setShowResultsState({});
                setIsSubmitting(false);
                setAllQuestionsCompleted(false);
            }

            // Handle ended polls
            const pollIsEnded = activePoll.status === 'ended' || activePoll.isEnded;
            setForceShowResults(pollIsEnded);
            setRemainingTime(activePoll.questionDuration || activePoll.duration || 60);
            setPollStatus(pollIsEnded ? 'expired' : 'voting');
            setPollEnded(pollIsEnded);

            // For ended polls, always force show results
            if (pollIsEnded) {
                setForceShowResults(true);
                if (activePoll.questions) {
                    const allResults = {};
                    for (let i = 0; i < activePoll.questions.length; i++) {
                        allResults[i] = true;
                    }
                    setShowResultsState(allResults);
                } else {
                    setShowResultsState({ 0: true });
                }
            }

            // Check if user has already voted in any questions
            if (activePoll.responses && activePoll.responses.length > 0) {
                const userVotedMap = {};
                const userResultsMap = {};

                activePoll.responses.forEach(response => {
                    const respUserId = typeof response.user === 'object' ?
                        response.user._id : response.user;

                    if (respUserId === user._id) {
                        const qIndex = response.questionIndex || 0;
                        userVotedMap[qIndex] = true;
                        userResultsMap[qIndex] = true;

                        if (user.role === 'SyndicateAdmin' && isNewPoll) {
                            const questionCount = activePoll.questions ? activePoll.questions.length : 1;
                            for (let i = 0; i < questionCount; i++) {
                                if (!userVotedMap[i]) {
                                    setCurrentQuestionIndex(i);
                                    break;
                                }
                            }
                        }
                    }
                });

                if (Object.keys(userVotedMap).length > 0) {
                    setVoted(userVotedMap);

                    if (!forceShowResults) {
                        setShowResultsState(userResultsMap);
                    }
                }
            }

            if (!pollIsEnded) {
                startTimer(activePoll.questionDuration || activePoll.duration || 60);
            } else {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            }

            fetchParticipants();
        }
    }, [activePoll, user._id]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    // Set up socket connection for real-time updates
    useEffect(() => {
        if (!eventId) return;

        if (!socketRef.current) {
            socketRef.current = initializeSocket();
            socketRef.current.on('pollStarted', handlePollStarted);
            socketRef.current.on('pollEnded', handlePollEnded);
            socketRef.current.on('voteRecorded', handleVoteRecorded);
            socketRef.current.on('voteCompletionUpdated', handleVoteCompletionUpdated);
            socketRef.current.emit('joinEvent', { eventId });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('pollStarted');
                socketRef.current.off('pollEnded');
                socketRef.current.off('voteRecorded');
                socketRef.current.off('voteCompletionUpdated');
            }
        };
    }, [eventId]);

    // Fetch participants count
    const fetchParticipants = async () => {
        if (!currentPoll) return;

        try {
            const response = await api.get(`/api/polls/${currentPoll.event}/active-participants`);
            setTotalParticipants(response.data.length || 1);
        } catch (error) {
            console.error('Error fetching participants:', error);
            setTotalParticipants(1);
        }
    };

    // Socket event handlers
    const handlePollStarted = (poll) => {
        if (user.role === 'SyndicateAdmin' && votedPollsRef.current.has(poll._id)) {
            return;
        }

        api.get(`/api/polls/${poll._id}/onepoll`)
            .then(response => {
                setCurrentPoll(response.data);
                resetPollState(response.data);
            })
            .catch(error => {
                console.error('Error fetching poll details:', error);
                setCurrentPoll(poll);
                resetPollState(poll);
            });
    };

    const handlePollEnded = (poll) => {
        if (!currentPoll || currentPoll._id !== poll._id) return;

        setForceShowResults(true);
        setPollEnded(true);
        setPollStatus('expired');

        if (currentPoll.questions) {
            const allResults = {};
            for (let i = 0; i < currentPoll.questions.length; i++) {
                allResults[i] = true;
            }
            setShowResultsState(allResults);
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleVoteRecorded = (data) => {
        if (!currentPoll || currentPoll._id !== data.pollId) return;

        api.get(`/api/polls/${data.pollId}/onepoll`)
            .then(response => {
                setCurrentPoll(response.data);

                if (response.data.responses) {
                    const uniqueVoters = new Set();
                    response.data.responses.forEach(response => {
                        if (response.questionIndex === currentQuestionIndex) {
                            uniqueVoters.add(typeof response.user === 'object' ? response.user._id : response.user);
                        }
                    });

                    setVotedParticipants(uniqueVoters.size);
                }
            })
            .catch(error => {
                console.error('Error refreshing poll data:', error);
            });
    };

    const handleVoteCompletionUpdated = (data) => {
        if (currentPoll && currentPoll._id === data.pollId &&
            data.questionIndex === currentQuestionIndex) {
            setVotedParticipants(data.votedCount);

            if (data.votedCount >= data.totalParticipants || data.timeExpired) {
                setForceShowResults(true);
                setPollStatus(data.timeExpired ? 'expired' : 'completed');
                setShowResultsState(prev => ({
                    ...prev,
                    [currentQuestionIndex]: true
                }));
            }
        }
    };

    // Reset poll state for a new poll
    const resetPollState = (poll) => {
        setCurrentQuestionIndex(0);
        setVoted({});
        setSelectedOptions({});
        setShowResultsState({});
        setIsSubmitting(false);
        setAllQuestionsCompleted(false);
        setRemainingTime(poll.questionDuration || poll.duration || 60);
        setPollStatus('voting');
        setPollEnded(false);
        setForceShowResults(false);
        startTimer(poll.questionDuration || poll.duration || 60);
    };

    // Timer function
    const startTimer = (duration) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        setRemainingTime(duration);

        timerRef.current = setInterval(() => {
            setRemainingTime(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Handle option selection
    const handleOptionSelect = (questionIndex, optionIndex) => {
        setSelectedOptions(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    // Submit vote
    const submitVote = async () => {
        if (!currentPoll || isSubmitting) return;

        const questionIndex = currentQuestionIndex;
        const optionIndex = selectedOptions[questionIndex];

        if (optionIndex === undefined) {
            toast.warning(t('pollModal.pleaseSelectOption'), {
                position: "top-right",
                autoClose: 3000
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await api.post(`/api/polls/${currentPoll._id}/vote`, {
                questionIndex,
                optionIndex
            });

            setVoted(prev => ({
                ...prev,
                [questionIndex]: true
            }));

            setShowResultsState(prev => ({
                ...prev,
                [questionIndex]: true
            }));

            dispatch(incrementLiveVotesUpdate());
            setIsSubmitting(false);

            const useOldFormat = !currentPoll.questions;
            const questionCount = useOldFormat ? 1 : currentPoll.questions.length;

            if (questionIndex >= questionCount - 1) {
                setAllQuestionsCompleted(true);

                const allResults = {};
                for (let i = 0; i < questionCount; i++) {
                    allResults[i] = true;
                }
                setShowResultsState(allResults);

                if (user.role === 'SyndicateAdmin') {
                    votedPollsRef.current.add(currentPoll._id);
                    setTimeout(() => {
                        togglePollModal();
                    }, 2500);
                }
            } else {
                setTimeout(() => {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                    startTimer(currentPoll.questionDuration || currentPoll.duration || 60);
                }, 1000);
            }
        } catch (error) {
            console.error('Error submitting vote:', error);
            setIsSubmitting(false);
            toast.error(`${t('pollModal.failedToSubmitVote')}: ${error.response?.data?.message || error.message}`);
        }
    };

    // Format time for display
    const formatTimeRemaining = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Calculate vote percentage
    const calculatePercentage = (votes, total) => {
        if (total === 0) return 0;
        return Math.round((votes / total) * 100);
    };

    // If no current poll, show empty state
    if (!currentPoll) {
        return (
            <Modal
                isOpen={showPollModal}
                toggle={togglePollModal}
                className="poll-modal"
                centered
                size="lg"
            >
                <ModalHeader toggle={togglePollModal}>
                    <div className="d-flex align-items-center">
                        <div className="poll-icon me-2">
                            <i className="ri-questionnaire-line"></i>
                        </div>
                        <span>{t('pollModal.interactivePoll')}</span>
                    </div>
                </ModalHeader>
                <ModalBody className="p-4 text-center">
                    <div className="empty-poll">
                        <i className="ri-questionnaire-line empty-poll-icon"></i>
                        <h4>{t('pollModal.noActivePoll')}</h4>
                        <p className="text-muted">
                            {isModerator
                                ? t('pollModal.startPollToEngage')
                                : t('pollModal.hostWillStartSoon')}
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={togglePollModal}>{t('pollModal.close')}</Button>
                </ModalFooter>
            </Modal>
        );
    }

    // Prepare current question data
    const useOldFormat = !currentPoll.questions;
    const questionCount = useOldFormat ? 1 : currentPoll.questions.length;

    let currentQuestion;
    try {
        if (useOldFormat) {
            currentQuestion = {
                title: currentPoll.title || t('pollModal.untitledPoll'),
                description: currentPoll.description || '',
                options: Array.isArray(currentPoll.options) ? currentPoll.options : []
            };
        } else {
            const safeIndex = Math.min(currentQuestionIndex, questionCount - 1);
            currentQuestion = currentPoll.questions[safeIndex];

            if (!currentQuestion) {
                currentQuestion = { title: t('pollModal.questionNotFound'), description: '', options: [] };
            }
        }
    } catch (err) {
        console.error('Error getting current question:', err);
        currentQuestion = { title: t('pollModal.errorLoadingQuestion'), description: '', options: [] };
    }

    // Calculate vote totals
    const totalVotes = Array.isArray(currentQuestion.options) ?
        currentQuestion.options.reduce((sum, option) => sum + (option.votes || 0), 0) : 0;

    // Check if user has voted on current question
    const hasVotedCurrent = voted[currentQuestionIndex] ||
        (currentPoll.responses && Array.isArray(currentPoll.responses) && currentPoll.responses.some(r => {
            if (!r || !r.user) return false;

            const responseUserId = typeof r.user === 'object' ? r.user._id : r.user;
            return responseUserId === user._id &&
                (useOldFormat || r.questionIndex === currentQuestionIndex);
        }));

    const showResultsCurrent = showResultsState[currentQuestionIndex] || hasVotedCurrent || forceShowResults;

    // Render full modal with active poll
    return (
        <Modal
            isOpen={showPollModal}
            toggle={togglePollModal}
            className="poll-modal"
            centered
            size="lg"
        >

            <ModalBody className="p-0">
                <div className="poll-question-header">
                    <h5>{currentQuestion.title}</h5>
                    {remainingTime > 0 && (
                        <div className="time-info">
                            <span>{t('pollModal.timeRemaining')}: {formatTimeRemaining(remainingTime)}</span>
                            <Progress
                                value={(remainingTime / (currentPoll.questionDuration || currentPoll.duration || 60)) * 100}
                                className="time-progress"
                            />
                        </div>
                    )}
                </div>

                <div className="poll-content p-4">
                    {!hasVotedCurrent && !showResultsCurrent && (
                        <div className="voting-options">
                            {currentQuestion.options.map((option, index) => (
                                <div 
                                    key={index}
                                    className={`option-item ${selectedOptions[currentQuestionIndex] === index ? 'selected' : ''}`}
                                    onClick={() => !isSubmitting && handleOptionSelect(currentQuestionIndex, index)}
                                >
                                    <div className="option-radio">
                                        <input
                                            type="radio"
                                            id={`option-${index}`}
                                            name="poll-option"
                                            checked={selectedOptions[currentQuestionIndex] === index}
                                            onChange={() => {}}
                                        />
                                        <label htmlFor={`option-${index}`}></label>
                                    </div>
                                    <span className="option-text">{option.text}</span>
                                </div>
                            ))}
                            
                            <div className="text-center mt-4">
                                <button
                                    className="submit-vote-btn"
                                    onClick={submitVote}
                                    disabled={isSubmitting || selectedOptions[currentQuestionIndex] === undefined}
                                >
                                    {isSubmitting ? t('pollModal.submitting') : t('pollModal.submitVote')}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {hasVotedCurrent && !showResultsCurrent && !forceShowResults && (
                        <div className="waiting-results">
                            <p>{t('pollModal.waitingForOthers', { votedCount: votedParticipants, totalCount: totalParticipants })}</p>
                            <button 
                                className="view-results-btn"
                                onClick={() => setShowResultsState(prev => ({ ...prev, [currentQuestionIndex]: true }))}
                            >
                                {t('pollModal.viewCurrentResults')}
                            </button>
                        </div>
                    )}
                    
                    {(showResultsCurrent || forceShowResults) && (
                        <div className="results-section">
                            <h6 className="results-header">
                                {t('pollModal.results')}
                                {totalVotes > 0 && (
                                    <span className="vote-count">
                                        {totalVotes} {t('pollModal.voteCount', { count: totalVotes })}
                                    </span>
                                )}
                            </h6>
                            
                            <div className="results-list">
                                {currentQuestion.options.map((option, index) => {
                                    const isUserVote = hasVotedCurrent && 
                                        currentPoll.responses && currentPoll.responses.some(r => {
                                            if (!r || !r.user) return false;
                                            const responseUserId = typeof r.user === 'object' ? r.user._id : r.user;
                                            return responseUserId === user._id &&
                                                (useOldFormat || r.questionIndex === currentQuestionIndex) &&
                                                r.optionIndex === index;
                                        });
                                    
                                    const percentage = calculatePercentage(option.votes, totalVotes);
                                    
                                    return (
                                        <div key={index} className={`result-item ${isUserVote ? 'user-vote' : ''}`}>
                                            <div className="result-info">
                                                <span className="result-text">{option.text}</span>
                                                {isUserVote && <span className="your-vote-badge">{t('pollModal.yourVote')}</span>}
                                            </div>
                                            <div className="result-stats">
                                                <span className="vote-value">{option.votes || 0}</span>
                                                <span className="vote-percentage">{percentage}%</span>
                                            </div>
                                            <div className="result-bar-container">
                                                <div 
                                                    className="result-bar" 
                                                    style={{width: `${percentage}%`}}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {questionCount > 1 && (
                        <div className="question-navigation">
                            {Array.from({ length: questionCount }).map((_, index) => (
                                <button
                                    key={index}
                                    className={`question-nav-btn ${index === currentQuestionIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentQuestionIndex(index)}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={togglePollModal}>{t('pollModal.close')}</Button>
            </ModalFooter>
            
            <style jsx>{`
                /* Poll Modal Styles */
                .poll-modal-header {
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #eaeaea;
                }
                
                .poll-icon {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    background-color: rgba(0, 123, 255, 0.1);
                    
                }
                
                .poll-icon.blue {
                    background-color: rgba(0, 123, 255, 0.1);
                    color: #0d6efd;
                }
                
                .poll-question-header {
                    background-color: #2c3e50;
                    color: white;
                    padding: 15px 20px;
                    position: relative;
                }
                
                .poll-question-header h5 {
                    margin-bottom: 10px;
                    font-weight: 500;
                }
                
                .time-info {
                    display: flex;
                    flex-direction: column;
                }
                
                .time-progress {
                    height: 4px;
                    margin-top: 8px;
                    background-color: rgba(255, 255, 255, 0.2);
                }
                
                .progress-bar {
                    background-color: white;
                }
                
                .poll-content {
                    padding: 20px;
                }
                
                .option-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    border: 1px solid #eaeaea;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .option-item:hover {
                    border-color: #c0c0c0;
                    background-color: #f8f9fa;
                }
                
                .option-item.selected {
                    border-color: #0d6efd;
                    background-color: rgba(13, 110, 253, 0.05);
                }
                
                .option-radio {
                    margin-right: 12px;
                }
                
                .option-radio input[type="radio"] {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border: 2px solid #d0d0d0;
                    border-radius: 50%;
                    position: relative;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                
                .option-radio input[type="radio"]:checked {
                    border-color: #0d6efd;
                    background-color: white;
                }
                
                .option-radio input[type="radio"]:checked::after {
                    content: "";
                    width: 10px;
                    height: 10px;
                    background-color: #0d6efd;
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                
                .submit-vote-btn {
                    background-color: #0d6efd;
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 6px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                
                .submit-vote-btn:hover {
                    background-color: #0b5ed7;
                }
                
                .submit-vote-btn:disabled {
                    background-color: #8bb1fd;
                    cursor: not-allowed;
                }
                
                .question-navigation {
                    display: flex;
                    justify-content: center;
                    margin-top: 20px;
                }
                
                .question-nav-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    margin: 0 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d0d0d0;
                    background-color: white;
                    transition: all 0.2s;
                }
                
                .question-nav-btn.active {
                    background-color: #0d6efd;
                    color: white;
                    border-color: #0d6efd;
                }
                
                .results-section {
                    margin-top: 10px;
                }
                
                .results-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .vote-count {
                    margin-left: 10px;
                    background-color: #f0f0f0;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    color: #666;
                }
                
                .results-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .result-item {
                    position: relative;
                }
                
                .result-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }
                
                .result-text {
                    font-size: 14px;
                }
                
                .your-vote-badge {
                    background-color: #0d6efd;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .result-stats {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }
                
                .vote-value {
                    font-size: 13px;
                    color: #666;
                }
                
                .vote-percentage {
                    font-size: 13px;
                    font-weight: 600;
                    color: #0d6efd;
                }
                
                .result-bar-container {
                    height: 8px;
                    background-color: #f0f0f0;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .result-bar {
                    height: 100%;
                    background-color: #0d6efd;
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }
                
                .waiting-results {
                    text-align: center;
                    padding: 20px 0;
                }
                
                .view-results-btn {
                    background-color: transparent;
                    border: 1px solid #0d6efd;
                    color: #0d6efd;
                    padding: 8px 16px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .view-results-btn:hover {
                    background-color: rgba(13, 110, 253, 0.1);
                }
                
                .empty-poll {
                    padding: 40px 0;
                }
                
                .empty-poll-icon {
                    font-size: 48px;
                    color: #ccc;
                    margin-bottom: 16px;
                }
            `}</style>
        </Modal>
    );
};

export default PollModal;