import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Card, CardBody, CardHeader, Button, Form, FormGroup, Input, Label, 
  Row, Col, Alert, Spinner, TabContent, TabPane, Nav, NavItem, NavLink,
  Container,
  Badge
} from 'reactstrap';
import { FaBuilding, FaPlus, FaStar, FaTrophy } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { 
  fetchWorkerReviews, addReviewComment, fetchAdminReviews,
  createReview, deleteReview, fetchWorkersByLocation,
  updateReview, deleteComment, fetchCompletedTasksForReview,
  createTaskReview, fetchTaskReview
} from '../../slices/Review/reviewSlice';
import classnames from 'classnames';
import TaskAccessGuard from "../Subscriptions/TaskAccessGuard";
import { withTranslation } from 'react-i18next';

import StarRating from './StarRating';
import RatingBar from './RatingBar';
import Pagination from './Pagination';
import ReviewCard from './ReviewCard';
import WorkerCard from './WorkerCard';
import TaskCard from './TaskCard';
import ReviewModal from './ReviewModal';
import DeleteModal from './DeleteModal';
import TaskReviewModal from './TaskReviewModal';
import ReviewsAnalytics from './ReviewsAnalytics';
import LeaderboardCard from './LeaderboardCard';

// Import assets
import buildb from '../../assets/images/Build.png';
import { clearReviewError, clearReviewMessage } from '../../slices/Review/reviewSlice';
import './WorkerReviews.css';
import BreadCrumb from '../Common/BreadCrumb';

const WorkerReviews = ({ t }) => {
  document.title = `${t('reviews.title')} | Nestleo`;

  const { user } = useSelector((state) => state.Loginn || {});
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const { 
    reviews: workerReviews = [], 
    adminReviews = [], 
    workers = [], 
    completedTasks = [],
    loading, 
    workersLoading,
    error, 
    message,
    currentTaskReview
  } = useSelector(state => state.review);
  const dispatch = useDispatch();
  
  // Component state
  const [commentText, setCommentText] = useState('');
  const [commentReviewId, setCommentReviewId] = useState(null);
  const [newReview, setNewReview] = useState({
    content: '',
    rating: 0,
    workerId: '',
    buildingId: currentBuilding?._id || ''
  });
  const [editingReview, setEditingReview] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [expandedReview, setExpandedReview] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [taskReviewModal, setTaskReviewModal] = useState(false);
  const [taskReviewData, setTaskReviewData] = useState({
    taskId: '',
    content: '',
    rating: 0,
    reviewId: null
  });
  
  // Pagination state
  const [reviewsCurrentPage, setReviewsCurrentPage] = useState(1);
  const [workersCurrentPage, setWorkersCurrentPage] = useState(1);
  const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Get worker rankings
  const getWorkerRankings = () => {
    // Sort all workers by average rating
    return [...workers]
      .filter(worker => worker.averageRating > 0)
      .sort((a, b) => b.averageRating - a.averageRating)
      .map(worker => worker._id);
  };

  // Get worker rank
  const getWorkerRank = (workerId) => {
    const rankings = getWorkerRankings();
    return rankings.indexOf(workerId);
  };

  const toggleTab = tab => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const toggleModal = () => {
    // If we're closing the modal, reset all form data
    if (modal) {
      setNewReview({
        content: '',
        rating: 0,
        workerId: '',
        buildingId: currentBuilding?._id || ''
      });
      setEditingReview(null);
      setValidationErrors({});
    } else if (user?.role === 'SyndicateAdmin') {
      // Always fetch workers when opening the modal, regardless of building selection
      dispatch(fetchWorkersByLocation());
    }
    
    // Toggle modal state
    setModal(!modal);
  };
  
  const toggleDeleteModal = () => setDeleteModal(!deleteModal);
  const toggleExpandedReview = (reviewId) => {
    setExpandedReview(expandedReview === reviewId ? null : reviewId);
  };
  const toggleTaskReviewModal = () => setTaskReviewModal(!taskReviewModal);

  // Data fetching hooks
  useEffect(() => {
    if (user?.role === 'Worker') {
      if (!user?.id) return;
      dispatch(fetchWorkerReviews(user.id));
    } else if (user?.role === 'SyndicateAdmin') {
      dispatch(fetchAdminReviews());
      // Always fetch workers, regardless of building selection
      dispatch(fetchWorkersByLocation());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(clearReviewMessage());
    }
    if (error) {
      toast.error(error);
      dispatch(clearReviewError());
    }
  }, [message, error, dispatch]);

  useEffect(() => {
    if (activeTab === '4' && currentBuilding) {
      fetchCompletedTasks(currentBuilding._id);
    }
  }, [activeTab, currentBuilding]);

  // Helper functions
  const fetchCompletedTasks = async (buildingId) => {
    try {
      await dispatch(fetchCompletedTasksForReview(buildingId));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleOpenTaskReviewModal = (task) => {
    setSelectedWorkerId(task.assignedTo);
    setTaskReviewData({
      taskId: task._id,
      content: '',
      rating: 0,
      reviewId: task.existingReviewId || null
    });
    
    if (task.existingReviewId) {
      dispatch(fetchTaskReview(task.existingReviewId))
        .then((result) => {
          if (fetchTaskReview.fulfilled.match(result)) {
            setTaskReviewData({
              taskId: task._id,
              content: result.payload.content,
              rating: result.payload.rating,
              reviewId: task.existingReviewId
            });
          }
        });
    }
    
    setTaskReviewModal(true);
  };

  const handleTaskReviewSubmit = async () => {
    try {
      await dispatch(createTaskReview(taskReviewData)).unwrap();
      setTaskReviewModal(false);
      if (activeTab === '4' && currentBuilding) {
        fetchCompletedTasks(currentBuilding._id);
      }
    } catch (error) {
      toast.error(error);
    }
  };

  const handleAddComment = async (reviewId) => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      await dispatch(addReviewComment({ reviewId, text: commentText })).unwrap();
      setCommentText('');
      setCommentReviewId(null);
      
      if (user?.role === 'Worker') {
        await dispatch(fetchWorkerReviews(user._id || user.id));
      } else if (user?.role === 'SyndicateAdmin') {
        await dispatch(fetchAdminReviews());
      }
    } catch (error) {
      toast.error(error || 'Failed to add comment');
    }
  };

  const validateReview = () => {
    const errors = {};
    if (!newReview.workerId) errors.workerId = 'Please select a worker';
    if (!newReview.content.trim()) errors.content = 'Review content is required';
    if (newReview.rating < 1 || newReview.rating > 5) errors.rating = 'Please select a rating between 1 and 5 stars';
    return errors;
  };

  const handleDeleteComment = async (reviewId, commentId) => {
    try {
      await dispatch(deleteComment({ reviewId, commentId })).unwrap();
      
      if (user?.role === 'Worker') {
        await dispatch(fetchWorkerReviews(user._id || user.id));
      } else if (user?.role === 'SyndicateAdmin') {
        await dispatch(fetchAdminReviews());
      }
    } catch (error) {
      toast.error(error || 'Failed to delete comment');
    }
  };

  const handleSubmitReview = async () => {
    const errors = validateReview();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
  
    try {
      if (editingReview) {
        await dispatch(updateReview({
          reviewId: editingReview._id,
          reviewData: {
            ...newReview,
            buildingId: currentBuilding?._id
          }
        })).unwrap();
      } else {
        await dispatch(createReview({
          ...newReview,
          buildingId: currentBuilding?._id
        })).unwrap();
      }
      
      setNewReview({
        content: '',
        rating: 0,
        workerId: '',
        buildingId: currentBuilding?._id || ''
      });
      setEditingReview(null);
      toggleModal();
      
      if (user?.role === 'SyndicateAdmin') {
        await dispatch(fetchAdminReviews());
      }
    } catch (error) {
      if (error && error.includes("already reviewed this worker")) {
        toggleModal();
        await dispatch(fetchAdminReviews());
    
        const existingReview = adminReviews.find(review => 
          review.worker._id === newReview.workerId
        );
        
        if (existingReview) {
          setTimeout(() => {
            handleEditReview(existingReview);
          }, 500);
        }
      } else {
        toast.error(error || (editingReview ? 'Failed to update review' : 'Failed to create review'));
      }
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setNewReview({
      content: review.content,
      rating: review.rating,
      workerId: review.worker._id,
      buildingId: review.building?._id || currentBuilding?._id || ''
    });
    toggleModal();
  };

  const handleDeleteReview = (reviewId) => {
    setReviewToDelete(reviewId);
    toggleDeleteModal();
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteReview(reviewToDelete)).unwrap();
      toggleDeleteModal();
      
      if (user?.role === 'SyndicateAdmin') {
        await dispatch(fetchAdminReviews());
      }
    } catch (error) {
      toast.error(error || 'Failed to delete review');
    }
  };

  const handleCommentClick = (reviewId) => {
    setCommentReviewId(commentReviewId === reviewId ? null : reviewId);
  };
  
  const handleSelectWorker = (workerId) => {
    setNewReview({
      ...newReview, 
      workerId,
      buildingId: currentBuilding?._id || ''
    });
    setSelectedWorkerId(workerId);
    toggleModal();
  };

  // Filter and pagination functions
  const getReviewsToDisplay = () => {
    let reviews = [];
    
    if (user?.role === 'Worker') {
      reviews = Array.isArray(workerReviews) ? [...workerReviews] : [];
    } else if (user?.role === 'SyndicateAdmin') {
      reviews = Array.isArray(adminReviews) ? [...adminReviews] : [];
      
      if (currentBuilding) {
        reviews = reviews.filter(review => 
          review.building?._id === currentBuilding._id
        );
      }
    }
    
    if (filterRating > 0) {
      reviews = reviews.filter(review => 
        Math.floor(review.rating) === filterRating
      );
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      reviews = reviews.filter(review => 
        review.content.toLowerCase().includes(term) ||
        review.worker?.firstName?.toLowerCase().includes(term) ||
        review.worker?.lastName?.toLowerCase().includes(term) ||
        review.createdBy?.firstName?.toLowerCase().includes(term) ||
        review.createdBy?.lastName?.toLowerCase().includes(term)
      );
    }
    
    return [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Get all reviews (unfiltered) for the rating bar
  const getAllReviews = () => {
    if (user?.role === 'Worker') {
      return Array.isArray(workerReviews) ? [...workerReviews] : [];
    } else if (user?.role === 'SyndicateAdmin') {
      const reviews = Array.isArray(adminReviews) ? [...adminReviews] : [];
      
      if (currentBuilding) {
        return reviews.filter(review => 
          review.building?._id === currentBuilding._id
        );
      }
      
      return reviews;
    }
    
    return [];
  };

  // Get data with pagination
  const reviewsToDisplay = getReviewsToDisplay();
  const allReviews = getAllReviews();
  const paginatedReviews = reviewsToDisplay.slice(
    (reviewsCurrentPage - 1) * itemsPerPage,
    reviewsCurrentPage * itemsPerPage
  );
  
  const paginatedWorkers = workers.slice(
    (workersCurrentPage - 1) * itemsPerPage,
    workersCurrentPage * itemsPerPage
  );
  
  const paginatedTasks = completedTasks.slice(
    (tasksCurrentPage - 1) * itemsPerPage,
    tasksCurrentPage * itemsPerPage
  );

  return (
    <React.Fragment>
      <TaskAccessGuard>
        <div className="page-content reviews-container">
          <Container fluid>
            <BreadCrumb title={t('reviews.title')} pageTitle={t('reviews.title')} />
            
            <Row className="mb-4">
              <Col>
                <Card className="welcome-card overflow-hidden">
                  <div className="position-absolute end-0 start-0 top-0 z-0"
                    style={{ height: '100%', background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                    <div className="position-absolute end-0 top-0 z-0">
                      <svg width="250" height="250" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-25">
                        <path fill="#4B79CF" d="M44.3,-76.4C58.6,-69.7,72.2,-59.3,79.6,-45.3C87,-31.2,88.3,-13.5,85.2,2.7C82.1,19,74.7,33.8,64.7,45.9C54.8,58,42.3,67.4,28.4,72.7C14.5,78,0.1,79.2,-15,77.4C-30.1,75.7,-46,71.1,-59.6,61.6C-73.2,52.2,-84.6,38,-86.2,23C-87.8,8.1,-79.6,-7.6,-74.1,-24.6C-68.5,-41.6,-65.5,-59.8,-54.8,-69.7C-44.1,-79.7,-25.6,-81.4,-7.7,-79.5C10.2,-77.6,30,-83,44.3,-76.4Z" transform="translate(100 100)" />
                      </svg>
                    </div>
                  </div>
                  <CardBody className="p-4 position-relative">
                    <Row className="align-items-center">
                      <Col md={8}>
                        <div className="text-start">
                          <h4 className="fw-semibold mb-2">{t('reviews.title')}</h4>
                          <p className="text-muted mb-3">{t('reviews.welcomeCard')}</p>
                          <div className="d-flex flex-wrap gap-2">
                            {currentBuilding && (
                              <Badge color="info" pill className="fs-12 py-2 px-3">
                                <FaBuilding className="me-1" /> {t('reviews.currentBuilding')}: {currentBuilding.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-end">
                          <div className="d-flex justify-content-end">
                            {user?.role === 'SyndicateAdmin' && (
                              <Button 
                                color="primary" 
                                className="add-review-btn"
                                onClick={toggleModal} 
                                disabled={!currentBuilding}
                              >
                                <FaPlus className="add-review-icon" />
                                {!currentBuilding ? t('selectBuildingFirst') : t('reviews.addNewReview')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col lg={12}>
                <Card className="border-0 shadow-sm">
                  <CardBody className="p-4">
                    <Nav className="reviews-tabs">
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === '1' })}
                          onClick={() => toggleTab('1')}
                          style={{ cursor: 'pointer' }}
                        >
                          {t('reviews.reviewsTab')}
                        </NavLink>
                      </NavItem>
                      {user?.role === 'SyndicateAdmin' && (
                        <NavItem>
                          <NavLink
                            className={classnames({ active: activeTab === '2' })}
                            onClick={() => toggleTab('2')}
                            style={{ cursor: 'pointer' }}
                          >
                            {t('reviews.workersTab')}
                          </NavLink>
                        </NavItem>
                      )}
                      {user?.role === 'SyndicateAdmin' && (
                        <NavItem>
                          <NavLink
                            className={classnames({ active: activeTab === '3' })}
                            onClick={() => toggleTab('3')}
                            style={{ cursor: 'pointer' }}
                          >
                            {t('reviews.analyticsTab')}
                          </NavLink>
                        </NavItem>
                      )}
                      {user?.role === 'SyndicateAdmin' && (
                        <NavItem>
                          <NavLink
                            className={classnames({ active: activeTab === '4' })}
                            onClick={() => {
                              toggleTab('4');
                              if (activeTab !== '4' && currentBuilding) {
                                fetchCompletedTasks(currentBuilding._id);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {t('reviews.taskReviewsTab')}
                          </NavLink>
                        </NavItem>
                      )}
                      {user?.role === 'SyndicateAdmin' && (
                        <NavItem>
                          <NavLink
                            className={classnames({ active: activeTab === '5' })}
                            onClick={() => toggleTab('5')}
                            style={{ cursor: 'pointer' }}
                          >
                            <FaTrophy className="mr-1" /> {t('reviews.leaderboardTab')}
                          </NavLink>
                        </NavItem>
                      )}
                    </Nav>

                    <TabContent activeTab={activeTab}>
                      <TabPane tabId="1">
                        {loading ? (
                          <div className="text-center p-5">
                            <Spinner color="primary" />
                            <p className="mt-3">{t('reviews.loadingReviews')}</p>
                          </div>
                        ) : (
                          <>
                            {/* Always show rating bar using ALL reviews, not just filtered ones */}
                            {allReviews.length > 0 && (
                              <RatingBar 
                                reviews={allReviews} 
                                filterRating={filterRating} 
                                setFilterRating={setFilterRating}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                              />
                            )}
                            
                            {allReviews.length === 0 ? (
                              <Alert color="info" className="text-center p-4">
                                {user?.role === 'Worker' ? t('reviews.noWorkerReviews') :
                                currentBuilding ? t('reviews.noBuildingReviews', { building: currentBuilding.name }) : 
                                t('reviews.noReviews')}
                              </Alert>
                            ) : reviewsToDisplay.length === 0 ? (
                              <div className="empty-state text-center py-4">
                                <div className="empty-state-icon mb-3">
                                  <i className="fa fa-search fa-3x text-muted"></i>
                                </div>
                                <h4>{t('reviews.noMatchingReviews')}</h4>
                                <p className="text-muted">
                                  {t('reviews.adjustFilters')}
                                </p>
                                <Button
                                  color="primary"
                                  onClick={() => {
                                    setFilterRating(0);
                                    setSearchTerm('');
                                  }}
                                >
                                  {t('reviews.clearFilters')}
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="reviews-grid">
                                  {paginatedReviews.map((review, index) => (
                                    <div 
                                      key={review._id} 
                                      className={`animate-fade-in delay-${(index % 5) + 1}`}
                                    >
                                      <ReviewCard
                                        review={review}
                                        user={user}
                                        handleEditReview={handleEditReview}
                                        handleDeleteReview={handleDeleteReview}
                                        handleCommentClick={handleCommentClick}
                                        handleAddComment={handleAddComment}
                                        handleDeleteComment={handleDeleteComment}
                                        commentReviewId={commentReviewId}
                                        commentText={commentText}
                                        setCommentText={setCommentText}
                                        toggleExpandedReview={toggleExpandedReview}
                                        expandedReview={expandedReview}
                                      />
                                    </div>
                                  ))}
                                </div>
                                
                                <Pagination 
                                  itemsCount={reviewsToDisplay.length}
                                  itemsPerPage={itemsPerPage}
                                  currentPage={reviewsCurrentPage}
                                  onPageChange={setReviewsCurrentPage}
                                />
                              </>
                            )}
                          </>
                        )}
                      </TabPane>

                      <TabPane tabId="2">
                        {user?.role === 'SyndicateAdmin' && (
                          <div>
                            {workersLoading ? (
                              <div className="text-center p-5">
                                <Spinner color="primary" />
                                <p className="mt-3">{t('reviews.loadingWorkers')}</p>
                              </div>
                            ) : workers.length === 0 ? (
                              <Alert color="info" className="text-center p-4">
                                {t('reviews.noWorkers')}
                              </Alert>
                            ) : (
                              <>
                                <div className="worker-grid">
                                  {paginatedWorkers.map((worker, index) => (
                                    <div key={worker._id} className={`animate-fade-in delay-${(index % 5) + 1}`}>
                                      <WorkerCard 
                                        worker={worker} 
                                        handleSelectWorker={handleSelectWorker}
                                        workerRank={getWorkerRank(worker._id)}
                                      />
                                    </div>
                                  ))}
                                </div>
                                
                                <Pagination 
                                  itemsCount={workers.length}
                                  itemsPerPage={itemsPerPage}
                                  currentPage={workersCurrentPage}
                                  onPageChange={setWorkersCurrentPage}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </TabPane>

                      <TabPane tabId="3">
                        {user?.role === 'SyndicateAdmin' && (
                          <ReviewsAnalytics reviewsToDisplay={allReviews} />
                        )}
                      </TabPane>
                      
                      <TabPane tabId="4">
                        {loading ? (
                          <div className="text-center p-5">
                            <Spinner color="primary" />
                            <p className="mt-3">{t('reviews.loadingTasks')}</p>
                          </div>
                        ) : (
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <h5 className="mb-0 font-weight-bold">{t('reviews.completedTasks')}</h5>
                              {currentBuilding && (
                                <Button 
                                  color="primary" 
                                  size="sm"
                                  className="action-button"
                                  onClick={() => fetchCompletedTasks(currentBuilding._id)}
                                >
                                  {t('reviews.refresh')}
                                </Button>
                              )}
                            </div>
                            
                            {!currentBuilding ? (
                              <Alert color="info">{t('selectBuildingToViewTasks')}</Alert>
                            ) : completedTasks.length === 0 ? (
                              <Alert color="info">{t('reviews.noCompletedTasks')}</Alert>
                            ) : (
                              <>
                                <div className="worker-grid">
                                  {paginatedTasks.map((task, index) => (
                                    <div key={task._id} className={`animate-fade-in delay-${(index % 5) + 1}`}>
                                      <TaskCard 
                                        task={task} 
                                        handleOpenTaskReviewModal={handleOpenTaskReviewModal} 
                                      />
                                    </div>
                                  ))}
                                </div>
                                
                                <Pagination 
                                  itemsCount={completedTasks.length}
                                  itemsPerPage={itemsPerPage}
                                  currentPage={tasksCurrentPage}
                                  onPageChange={setTasksCurrentPage}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </TabPane>
                      
                      {/* New Leaderboard Tab */}
                      <TabPane tabId="5">
                        {workersLoading ? (
                          <div className="text-center p-5">
                            <Spinner color="primary" />
                            <p className="mt-3">{t('reviews.loadingLeaderboard')}</p>
                          </div>
                        ) : (
                          <LeaderboardCard workers={workers} />
                        )}
                      </TabPane>
                    </TabContent>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* Modals */}
            <ReviewModal
              isOpen={modal}
              toggle={toggleModal}
              editingReview={editingReview}
              currentBuilding={currentBuilding}
              workersLoading={workersLoading}
              workers={workers}
              newReview={newReview}
              setNewReview={setNewReview}
              validationErrors={validationErrors}
              handleSubmitReview={handleSubmitReview}
              loading={loading}
            />

            <DeleteModal
              isOpen={deleteModal}
              toggle={toggleDeleteModal}
              confirmDelete={confirmDelete}
            />

            <TaskReviewModal
              isOpen={taskReviewModal}
              toggle={toggleTaskReviewModal}
              taskReviewData={taskReviewData}
              setTaskReviewData={setTaskReviewData}
              handleTaskReviewSubmit={handleTaskReviewSubmit}
              currentTaskReview={currentTaskReview}
              loading={loading}
            />
          </Container>
        </div>
      </TaskAccessGuard>
    </React.Fragment>
  );
};

export default withTranslation()(WorkerReviews);