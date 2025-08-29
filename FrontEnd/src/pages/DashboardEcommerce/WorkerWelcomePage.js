import React, { useState, useEffect, useCallback } from "react";
import {
  Row, Col, Card, CardBody, CardHeader,
  Badge, Progress, Button, ListGroup, ListGroupItem
} from "reactstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CountUp from "react-countup";
import { withTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import {
  FaTasks, FaClipboardCheck, FaClock, FaExclamationTriangle,
  FaCheckCircle, FaUserClock, FaChartLine, FaBuilding
} from "react-icons/fa";
import { fetchTasks } from "../../slices/Task/taskSlice";
import BreadCrumb from "../../Components/Common/BreadCrumb";

const WorkerWelcome = ({ t, user }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  
  // Get tasks from Redux store
  const { tasks = [], error } = useSelector(state => state.task);
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  
  // Fetch tasks on component mount
  useEffect(() => {
    setLoading(true);
    dispatch(fetchTasks())
      .unwrap()
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, currentBuilding]);
  
  // Task statistics
  const totalTasks = tasks.length;
  const assignedTasks = tasks.filter(task => task.status === 'Assigned').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const completedTasks = tasks.filter(task => task.status === 'Completed').length;
  
  // Priority-based tasks
  const criticalTasks = tasks.filter(task => task.priority === 'Critical').length;
  const highPriorityTasks = tasks.filter(task => task.priority === 'High').length;
  const mediumPriorityTasks = tasks.filter(task => task.priority === 'Medium').length;
  const lowPriorityTasks = tasks.filter(task => task.priority === 'Low').length;
  
  // Calculate completion rate
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
  
  // Calculate progress rate
  const progressRate = totalTasks > 0
    ? Math.round(((inProgressTasks + completedTasks) / totalTasks) * 100)
    : 0;
  
  // Get badge color for task status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'primary';
      case 'Assigned': return 'warning';
      case 'In Progress': return 'info';
      case 'Completed': return 'success';
      default: return 'secondary';
    }
  };
  
  // Get badge color for task priority
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return 'success';
      case 'Medium': return 'info';
      case 'High': return 'warning';
      case 'Critical': return 'danger';
      default: return 'secondary';
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <Card className="welcome-card overflow-hidden">
            <div className="position-absolute end-0 start-0 top-0 z-0"
                style={{ height: '100%', background: 'linear-gradient(135deg, #4ade8014 0%, #0ea5e91c 100%)' }}>
              <div className="position-absolute end-0 top-0 z-0">
                <svg width="250" height="250" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-25">
                  <path fill="#0ea5e9" d="M44.3,-76.4C58.6,-69.7,72.2,-59.3,79.6,-45.3C87,-31.2,88.3,-13.5,85.2,2.7C82.1,19,74.7,33.8,64.7,45.9C54.8,58,42.3,67.4,28.4,72.7C14.5,78,0.1,79.2,-15,77.4C-30.1,75.7,-46,71.1,-59.6,61.6C-73.2,52.2,-84.6,38,-86.2,23C-87.8,8.1,-79.6,-7.6,-74.1,-24.6C-68.5,-41.6,-65.5,-59.8,-54.8,-69.7C-44.1,-79.7,-25.6,-81.4,-7.7,-79.5C10.2,-77.6,30,-83,44.3,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>
            </div>
            <CardBody className="p-4 position-relative">
              <Row className="align-items-center">
                <Col md={8}>
                  <div className="text-start">
                    <h4 className="fw-semibold mb-2">{t('worker.welcome')}, {user.firstName}! 👋</h4>
                    <p className="mb-3 text-muted">{t('worker.welcomeMessage')}</p>
                    <div className="d-flex flex-wrap gap-2">
                      <Button color="primary" tag={Link} to="/profile">
                        <i className="ri-user-settings-line align-bottom me-1"></i> {t('common.myProfile')}
                      </Button>
                      <Button color="success" tag={Link} to="/tasks">
                        <i className="ri-task-line align-bottom me-1"></i> {t('worker.viewAllTasks')}
                      </Button>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end mt-3 mt-md-0">
                    <div className="mb-2">
                      <span className="badge bg-soft-success fs-12">
                        <i className="ri-check-double-line align-bottom me-1"></i> {completionRate}% {t('worker.completionRate')}
                      </span>
                    </div>
                    <div className="position-relative mt-3">
                      <div className="dashboard-icon-badge text-info">
                        <FaUserClock size={48} />
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Task Statistics */}
      <Row className="mb-4">
        <Col xl={3} md={6}>
          <Card className="card-animate">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-uppercase fw-medium text-muted mb-0">{t('worker.totalTasks')}</p>
                </div>
                <div className="flex-shrink-0">
                  <h5 className="fs-14 mb-0 text-primary">
                    <i className="ri-task-line fs-13 align-middle"></i> {totalTasks}
                  </h5>
                </div>
              </div>
              <div className="d-flex align-items-end justify-content-between mt-4">
                <div>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                    <CountUp start={0} end={totalTasks} duration={2} className="counter-value" />
                  </h4>
                  <span className="badge bg-primary me-1">
                    {assignedTasks + inProgressTasks} {t('task.active')}
                  </span>
                  <span className="text-muted">{t('task.assignedToYou')}</span>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-light rounded fs-3">
                    <FaTasks className="text-primary" />
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="card-animate">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-uppercase fw-medium text-muted mb-0">{t('task.inProgress')}</p>
                </div>
                <div className="flex-shrink-0">
                  <h5 className="fs-14 mb-0 text-info">
                    <i className="ri-loader-4-line fs-13 align-middle"></i> {inProgressTasks}
                  </h5>
                </div>
              </div>
              <div className="d-flex align-items-end justify-content-between mt-4">
                <div>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                    <CountUp start={0} end={inProgressTasks} duration={2} className="counter-value" />
                  </h4>
                  <span className="badge bg-info me-1">
                    {progressRate}% {t('common.progress')}
                  </span>
                  <span className="text-muted">{t('task.tasksInProgress')}</span>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-light rounded fs-3">
                    <FaClock className="text-info" />
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="card-animate">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-uppercase fw-medium text-muted mb-0">{t('worker.completedTasks')}</p>
                </div>
                <div className="flex-shrink-0">
                  <h5 className="fs-14 mb-0 text-success">
                    <i className="ri-check-double-line fs-13 align-middle"></i> {completedTasks}
                  </h5>
                </div>
              </div>
              <div className="d-flex align-items-end justify-content-between mt-4">
                <div>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                    <CountUp start={0} end={completedTasks} duration={2} className="counter-value" />
                  </h4>
                  <span className="badge bg-success me-1">
                    {completionRate}% {t('common.rate')}
                  </span>
                  <span className="text-muted">{t('worker.tasksCompleted')}</span>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-light rounded fs-3">
                    <FaCheckCircle className="text-success" />
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="card-animate">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-uppercase fw-medium text-muted mb-0">{t('task.highPriority')}</p>
                </div>
                <div className="flex-shrink-0">
                  <h5 className="fs-14 mb-0 text-danger">
                    <i className="ri-error-warning-line fs-13 align-middle"></i> {criticalTasks + highPriorityTasks}
                  </h5>
                </div>
              </div>
              <div className="d-flex align-items-end justify-content-between mt-4">
                <div>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                    <CountUp start={0} end={criticalTasks + highPriorityTasks} duration={2} className="counter-value" />
                  </h4>
                  <span className="badge bg-danger me-1">
                    {criticalTasks} {t('task.critical')}
                  </span>
                  <span className="text-muted">{t('task.needAttention')}</span>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-light rounded fs-3">
                    <FaExclamationTriangle className="text-warning" />
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Task Overview and Current Tasks */}
      <Row>
        {/* Task Progress */}
        <Col lg={6}>
          <Card className="mb-4">
            <CardHeader className="align-items-center d-flex">
              <h4 className="card-title mb-0 flex-grow-1">
                <FaChartLine className="me-2" /> {t('task.taskOverview')}
              </h4>
              <div className="flex-shrink-0">
                <Button color="primary" size="sm" tag={Link} to="/task">
                  {t('worker.viewAllTasks')}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="task-progress mb-4">
                <h6 className="mb-3">{t('task.overallCompletion')}</h6>
                <div className="d-flex justify-content-between mb-1">
                  <span>{t('common.progress')}</span>
                  <span>{completionRate}%</span>
                </div>
                <Progress 
                  value={completionRate} 
                  color={completionRate < 30 ? "danger" : completionRate < 70 ? "warning" : "success"} 
                  className="mb-4" 
                  style={{height: "10px"}} 
                />
                
                <div className="task-stats">
                  <Row className="text-center">
                    <Col xs={3}>
                      <div className="task-stat-item">
                        <span className={`badge bg-soft-warning text-warning p-2`}>
                          {assignedTasks}
                        </span>
                        <p className="text-muted mt-2">{t('task.assigned')}</p>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div className="task-stat-item">
                        <span className={`badge bg-soft-info text-info p-2`}>
                          {inProgressTasks}
                        </span>
                        <p className="text-muted mt-2">{t('task.inProgress')}</p>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div className="task-stat-item">
                        <span className={`badge bg-soft-success text-success p-2`}>
                          {completedTasks}
                        </span>
                        <p className="text-muted mt-2">{t('task.completed')}</p>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div className="task-stat-item">
                        <span className={`badge bg-soft-primary text-primary p-2`}>
                          {totalTasks}
                        </span>
                        <p className="text-muted mt-2">{t('common.total')}</p>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>

              <div className="task-priority-stats mt-4">
                <h6 className="mb-3">{t('task.tasksByPriority')}</h6>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>{t('task.critical')}</span>
                    <span>{criticalTasks} {t('task.tasks')}</span>
                  </div>
                  <Progress value={(criticalTasks / totalTasks) * 100} color="danger" style={{height: "6px"}} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>{t('task.high')}</span>
                    <span>{highPriorityTasks} {t('task.tasks')}</span>
                  </div>
                  <Progress value={(highPriorityTasks / totalTasks) * 100} color="warning" style={{height: "6px"}} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>{t('task.medium')}</span>
                    <span>{mediumPriorityTasks} {t('task.tasks')}</span>
                  </div>
                  <Progress value={(mediumPriorityTasks / totalTasks) * 100} color="info" style={{height: "6px"}} />
                </div>
                <div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>{t('task.low')}</span>
                    <span>{lowPriorityTasks} {t('task.tasks')}</span>
                  </div>
                  <Progress value={(lowPriorityTasks / totalTasks) * 100} color="success" style={{height: "6px"}} />
                </div>
              </div>
              
              {currentBuilding && (
                <div className="current-building mt-4 p-3 bg-light rounded">
                  <div className="d-flex align-items-center">
                    <FaBuilding className="me-2 text-primary" size={20} />
                    <div>
                      <h6 className="mb-0">{t('building.currentBuilding')}: {currentBuilding.name}</h6>
                      <small className="text-muted">{currentBuilding.address_street}, {currentBuilding.address_city}</small>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Current Tasks */}
        <Col lg={6}>
          <Card className="mb-4">
            <CardHeader className="align-items-center d-flex">
              <h4 className="card-title mb-0 flex-grow-1">
                <FaClipboardCheck className="me-2" /> {t('task.yourActiveTasks')}
              </h4>
              <div className="flex-shrink-0">
                {criticalTasks > 0 && (
                  <Badge color="danger" className="me-2">
                    {criticalTasks} {t('task.critical')}
                  </Badge>
                )}
                <Button color="info" size="sm" tag={Link} to="/task">
                  {t('task.viewKanban')}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center p-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">{t('common.loading')}</span>
                  </div>
                </div>
              ) : tasks.length > 0 ? (
                <div className="tasks-list">
                  {tasks
                    .filter(task => task.status !== 'Completed')
                    .sort((a, b) => {
                      // Sort by priority first
                      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                      
                      if (priorityDiff !== 0) return priorityDiff;
                      
                      // Then by status
                      const statusOrder = { 'In Progress': 0, 'Assigned': 1 };
                      return statusOrder[a.status] - statusOrder[b.status];
                    })
                    .slice(0, 5)
                    .map((task, index) => (
                      <div key={task._id || index} className="task-item">
                        <div className="d-flex align-items-start">
                          <div className="flex-shrink-0 me-3">
                            <div className={`avatar-sm task-avatar bg-soft-${getPriorityColor(task.priority)} rounded`}>
                              <span className={`avatar-title rounded text-${getPriorityColor(task.priority)}`}>
                                {task.priority === 'Critical' ? 
                                  <i className="ri-alarm-warning-line"></i> : 
                                  <i className="ri-task-line"></i>}
                              </span>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{task.title}</h6>
                            <p className="text-muted mb-2 task-description">
                              {task.description?.length > 100 
                                ? `${task.description.substring(0, 100)}...` 
                                : task.description}
                            </p>
                            <div className="d-flex align-items-center flex-wrap gap-2">
                              <Badge color={getStatusColor(task.status)} pill>
                                {task.status}
                              </Badge>
                              <Badge color={getPriorityColor(task.priority)} pill>
                                {task.priority}
                              </Badge>
                              <small className="text-muted ms-auto">
                                {task.building?.name || t('common.building')} • {formatDate(task.createdAt)}
                              </small>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ms-2">
                            <Button color="light" size="sm" tag={Link} to={`/task?taskId=${task._id}`}>
                              <i className="ri-arrow-right-s-line"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="avatar-md mx-auto mb-4">
                    <div className="avatar-title bg-light text-primary rounded-circle fs-2">
                      <i className="ri-task-line"></i>
                    </div>
                  </div>
                  <h5>{t('worker.noTasks')}</h5>
                  <p className="text-muted">{t('worker.noTasksMessage')}</p>
                </div>
              )}

              {tasks.filter(task => task.status !== 'Completed').length > 5 && (
                <div className="text-center mt-3">
                  <Button color="light" tag={Link} to="/task">
                    {t('worker.viewAll')} <i className="ri-arrow-right-line align-bottom"></i>
                  </Button>
                </div>
              )}

              {/* Recently Completed Tasks */}
              {tasks.filter(task => task.status === 'Completed').length > 0 && (
                <div className="recently-completed mt-4">
                  <h6>{t('task.recentlyCompleted')}</h6>
                  <ListGroup flush>
                    {tasks
                      .filter(task => task.status === 'Completed')
                      .slice(0, 3)
                      .map((task, index) => (
                        <ListGroupItem key={task._id || index} className="px-0 py-2 border-0">
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-2">
                              <i className="ri-checkbox-circle-fill text-success"></i>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-0 fs-13">{task.title}</h6>
                              <small className="text-muted">{formatDate(task.updatedAt)}</small>
                            </div>
                          </div>
                        </ListGroupItem>
                      ))}
                  </ListGroup>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        /* Enhanced styles for WorkerWelcome page */
        .welcome-card {
          background: #fff;
          border: none;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
        }
        
        /* Task Stats */
        .task-stat-item {
          padding: 10px;
          transition: all 0.3s;
        }
        
        .task-stat-item:hover {
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        /* Tasks List */
        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .task-item {
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 10px;
          border-left: 3px solid #0ea5e9;
          transition: all 0.3s ease;
        }
        
        .task-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        
        .task-avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        
        .task-description {
          font-size: 0.85rem;
          line-height: 1.5;
        }
        
        /* Recently Completed */
        .recently-completed {
          border-top: 1px solid #e9ebec;
          padding-top: 15px;
        }
      `}</style>
    </>
  );
};

WorkerWelcome.propTypes = {
  t: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired
};

export default withTranslation()(WorkerWelcome);