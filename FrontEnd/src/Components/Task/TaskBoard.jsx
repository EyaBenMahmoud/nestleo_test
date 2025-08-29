import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TaskAccessGuard from '../Subscriptions/TaskAccessGuard';
import { hasTaskManagementAccess } from '../Subscriptions/SubcriptionValidator';
import {
  Card,
  CardBody,
  Container,
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  ListGroup,
  ListGroupItem,
  Table,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  ButtonGroup,
  Pagination,
  PaginationItem,
  PaginationLink,
  CardHeader
} from 'reactstrap';
import { toast } from 'react-toastify';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  FaEllipsisH, FaPlus, FaCheck, FaTimes, FaPaperclip, FaComment, 
  FaUser, FaEdit, FaTrash, FaSave, FaBuilding, FaFileAlt, 
  FaInfoCircle, FaCalendarAlt, FaSync, FaUserPlus, FaQuestionCircle,
  FaListUl, FaThLarge, FaTable,
  FaUserCheck,
  FaExclamationTriangle,
  FaEye
} from 'react-icons/fa';
import { withTranslation } from 'react-i18next';
import DeleteModal from '../../Components/Common/DeleteModal';
import {
  fetchTasks,
  createTask,
  assignTask,
  respondToAssignment,
  updateTaskStatus,
  addComment,
  fetchWorkersForBuilding,
  setCurrentTask,
  clearCurrentTask,
  clearTaskError,
  clearTaskMessage,
  updateTaskInList,
  updateTaskDetails,
  deleteTask,
  requestTaskAssignment,
  respondToTaskRequest,
  fetchTaskRequests
} from '../../slices/Task/taskSlice';
import './kanbanStyles.css'; 
import BreadCrumb from '../Common/BreadCrumb';

const TaskBoard = ({ t }) => {
  document.title = `${t('taskBoard.title')} | Nestleo`;

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.Loginn || {});
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const hasAccess = hasTaskManagementAccess(user);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Redux state
  const {
    tasks = [],
    workers = [],
    currentTask: selectedTask,
    loading,
    workersLoading,
    error,
    message
  } = useSelector(state => state.task);

  // View state
  const [viewMode, setViewMode] = useState('table');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [editValidationErrors, setEditValidationErrors] = useState({});
  
  // Modal states
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Form states
  const [commentText, setCommentText] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    building: currentBuilding?._id || '',
    priority: 'Medium'
  });
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskData, setEditTaskData] = useState({
    title: '',
    description: '',
    priority: ''
  });
  const [taskRequests, setTaskRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [dropdownOpen, setDropdownOpen] = useState({});

  // Statistics calculations
  const totalTasks = tasks.length;
  const availableTasks = tasks.filter(task => task.status === 'Available').length;
  const assignedTasks = tasks.filter(task => task.status === 'Assigned').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const completedTasks = tasks.filter(task => task.status === 'Completed').length;
  const declinedTasks = tasks.filter(task => task.status === 'Declined').length;

  // Toggle dropdown
  const toggleDropdown = (id) => {
    setDropdownOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Validation functions
  const validateTaskForm = (taskData, isEdit = false) => {
    const errors = {};
    
    // Title validation
    if (!taskData.title || !taskData.title.trim()) {
      errors.title = t('taskBoard.validation.titleRequired');
    } else if (taskData.title.trim().length < 3) {
      errors.title = t('taskBoard.validation.titleMinLength');
    } else if (taskData.title.trim().length > 100) {
      errors.title = t('taskBoard.validation.titleMaxLength');
    }
    
    // Description validation
    if (!taskData.description || !taskData.description.trim()) {
      errors.description = t('taskBoard.validation.descriptionRequired');
    } else if (taskData.description.trim().length < 10) {
      errors.description = t('taskBoard.validation.descriptionMinLength');
    } else if (taskData.description.trim().length > 500) {
      errors.description = t('taskBoard.validation.descriptionMaxLength');
    }
    
    // Priority validation
    if (!taskData.priority) {
      errors.priority = t('taskBoard.validation.priorityRequired');
    }
    
    // Building validation (only for create, not edit)
    if (!isEdit && (!taskData.building || !taskData.building.trim())) {
      errors.building = t('taskBoard.validation.buildingRequired');
    }
    
    return errors;
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
    setEditValidationErrors({});
  };

  // Update new task building when current building changes
  useEffect(() => {
    setNewTask(prev => ({
      ...prev,
      building: currentBuilding?._id || ''
    }));
  }, [currentBuilding]);

  // Fetch tasks on mount or when user changes
  useEffect(() => {
    if (user) {
      dispatch(fetchTasks())
        .unwrap()
        .catch(err => {
          console.error("Task fetch failed:", err);
          dispatch(clearTaskError());
        });
    }
  }, [dispatch, user]);

  // Handle errors and messages
  useEffect(() => {
    if (error) {
      toast.error(t(error));
      dispatch(clearTaskError());
    }
    if (message) {
      toast.success(t(message));
      dispatch(clearTaskMessage());
    }
  }, [error, message, dispatch, t]);

  // Select a task to view details
  const handleTaskSelect = (task) => {
    dispatch(setCurrentTask(task));
    setSelectedWorker('');
    if (user?.role === 'SyndicateAdmin' && task.building) {
      dispatch(fetchWorkersForBuilding(task.building._id || task.building));
    }
  };

  // Check if current user has rejected a task request
  const hasCurrentUserRejectedRequest = (task) => {
    if (user?.role !== 'Worker' || !task?.taskRequests) return false;
    return task.taskRequests.some(
      req => req.worker._id === user._id && req.status === 'Rejected'
    );
  };

  // Check if current user has pending request for a task
  const hasCurrentUserPendingRequest = (task) => {
    if (user?.role !== 'Worker' || !task?.taskRequests) return false;
    return task.taskRequests.some(
      req => req.worker._id === user._id && req.status === 'Pending'
    );
  };

  // Check if task has pending assignment for current user
  const hasPendingAssignment = (task) => {
    if (user?.role !== 'Worker' || !task?.assignmentRequests) return false;
    return task.assignmentRequests.some(
      request => request.worker === user._id && request.status === 'Pending'
    );
  };

  // Check if current user has requested a task
  const hasRequestedTask = (task) => {
    if (user?.role !== 'Worker' || !task?.taskRequests || !task.taskRequests.length) return false;
    return task.taskRequests.some(req => req.worker._id === user._id);
  };

  // Group tasks for kanban view
  const groupedTasks = useMemo(() => {
    let result = tasks;
    
    if (user?.role === 'SyndicateAdmin' && currentBuilding?._id) {
      result = result.filter(task => 
        task.building?._id === currentBuilding._id || 
        task.building === currentBuilding._id
      );
    }
        
    const grouped = {
      Available: [],
      Assigned: [],
      'In Progress': [],
      Completed: [],
      Declined: []
    };
    
    result.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    
    return grouped;
  }, [tasks, user?.role, currentBuilding?._id]);

  // Filter tasks for table view
  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    if ((user?.role === 'SyndicateAdmin' || user?.role === 'SyndicateCoowner') && currentBuilding?._id) {
      result = result.filter(task => 
        task.building?._id === currentBuilding._id || 
        task.building === currentBuilding._id
      );
    }
    
    if (statusFilter !== 'All') {
      result = result.filter(task => task?.status === statusFilter);
    }
    
    return result;
  }, [tasks, statusFilter, user?.role, currentBuilding?._id]);

  // Create a new task
  const handleCreateTask = async () => {
    const taskData = {
      ...newTask,
      building: currentBuilding._id
    };

    // Validate the form
    const errors = validateTaskForm(taskData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous validation errors
    setValidationErrors({});
    
    try {
      await dispatch(createTask(taskData)).unwrap();
      toast.success(t('taskBoard.taskCreatedSuccessfully'));
      setModal(false);
      setNewTask({ 
        title: '', 
        description: '', 
        building: currentBuilding._id,
        priority: 'Medium'
      });
    } catch (error) {
      // Error handling is already done in the useEffect hook
      console.error('Failed to create task:', error);
      toast.error(t('taskBoard.validation.createFailed'));
    }
  };

  // Start editing a task
  const startEditing = (task) => {
    setEditingTask(task._id);
    setEditTaskData({
      title: task.title,
      description: task.description,
      priority: task.priority
    });
    setEditValidationErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingTask(null);
    setEditTaskData({
      title: '',
      description: '',
      priority: ''
    });
    setEditValidationErrors({});
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return 'success';
      case 'Medium': return 'primary';
      case 'High': return 'warning';
      case 'Critical': return 'danger';
      default: return 'secondary';
    }
  };

  // Update task details
  const handleUpdateTask = async (taskId) => {
    // Validate the form
    const errors = validateTaskForm(editTaskData, true);
    if (Object.keys(errors).length > 0) {
      setEditValidationErrors(errors);
      return;
    }

    // Clear any previous validation errors
    setEditValidationErrors({});

    try {
      await dispatch(updateTaskDetails({
        taskId,
        taskData: editTaskData
      })).unwrap();
      setEditingTask(null);
      toast.success(t('taskBoard.taskCreatedSuccessfully'));
    } catch (error) {
      toast.error(t('taskBoard.validation.updateFailed'));
    }
  };

  // Delete task handlers
  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      dispatch(deleteTask(taskToDelete._id));
    }
    setDeleteModal(false);
    setTaskToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteModal(false);
    setTaskToDelete(null);
  };

  // Assign task to worker
  const handleAssignTask = async () => {
    if (!selectedTask || !selectedWorker) {
      toast.error(t('taskBoard.selectWorker'));
      return;
    }
    
    try {
      const result = await dispatch(assignTask({
        taskId: selectedTask._id,
        workerId: selectedWorker
      })).unwrap();
      
      dispatch(setCurrentTask(result.data));
      toast.success(t('taskBoard.assignSuccess'));
      setSelectedWorker('');
    } catch (error) {
      toast.error(t(error.message) || t('taskBoard.assignFailed'));
    }
  };

  // Respond to task assignment
  const handleRespondToAssignment = async (response) => {
    if (!selectedTask) return;
    dispatch(respondToAssignment({
      taskId: selectedTask._id,
      response
    })).then(() => {
      dispatch(clearCurrentTask());
    });
  };

  // Request task assignment
  const handleRequestTask = async (taskId) => {
    try {
      await dispatch(requestTaskAssignment(taskId)).unwrap();
      toast.success(t('taskBoard.requestSubmitted'));
    } catch (error) {
      toast.error(t(error.message) || t('taskBoard.requestFailed'));
    }
  };

  // Respond to task request
  const handleRespondToTaskRequest = async ({ taskId, workerId, response }) => {
    try {
      await dispatch(respondToTaskRequest({ taskId, workerId, response })).unwrap();
      toast.success(t(`taskBoard.request${response}`));
      setShowRequestsModal(false);
    } catch (error) {
      toast.error(t(error.message) || t('taskBoard.requestResponseFailed'));
    }
  };

  // Update task status
  const handleUpdateStatus = async (status) => {
    if (!selectedTask) return;
    
    if (status === 'Assigned' && !selectedTask.assignedTo) {
      toast.error(t('taskBoard.assignFirst'));
      return;
    }
    
    dispatch(updateTaskStatus({
      taskId: selectedTask._id,
      status
    })).then(() => {
      dispatch(clearCurrentTask());
    });
  };

  // Add comment to task
  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;
    
    try {
      const optimisticTask = {
        ...selectedTask,
        comments: [
          ...(selectedTask.comments || []),
          {
            text: commentText,
            createdAt: new Date().toISOString(),
            createdBy: {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName
            }
          }
        ]
      };
      dispatch(setCurrentTask(optimisticTask));
      setCommentText('');
  
      await dispatch(addComment({
        taskId: selectedTask._id,
        text: commentText
      }));
    } catch (error) {
      dispatch(setCurrentTask(selectedTask));
      toast.error(t('taskBoard.commentFailed'));
    }
  };

  // Load task requests
  const loadTaskRequests = async () => {
    try {
      const result = await dispatch(fetchTaskRequests()).unwrap();
      setTaskRequests(result);
    } catch (error) {
      toast.error(t('taskBoard.loadRequestsFailed'));
    }
  };

  // Get color for status badge
  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'primary';
      case 'Assigned': return 'warning';
      case 'In Progress': return 'info';
      case 'Completed': return 'success';
      case 'Declined': return 'danger';
      default: return 'secondary';
    }
  };

  // Get allowed status transitions
  const getAllowedStatuses = (currentStatus, role) => {
    const adminTransitions = {
      'Available': [],
      'Assigned': ['In Progress', 'Declined', 'Available'],
      'In Progress': ['Completed', 'Assigned'],
      'Completed': [],
      'Declined': ['Available']
    };

    const workerTransitions = {
      'Assigned': ['In Progress', 'Declined'],
      'In Progress': ['Completed']
    };

    if (role === 'SyndicateAdmin') {
      return adminTransitions[currentStatus] || [];
    } else if (role === 'Worker') {
      return workerTransitions[currentStatus] || [];
    }
    return [];
  };

  // Handle drag and drop for kanban
  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
  
    if (!destination) {
      return;
    }
  
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
  
    const task = tasks.find(t => t._id === draggableId);
    if (!task) return;
  
    if (destination.droppableId !== source.droppableId) {
      const allowedStatuses = getAllowedStatuses(task.status, user?.role);
      
      if (!allowedStatuses.includes(destination.droppableId)) {
        toast.error(t(`taskBoard.invalidTransition`, { from: task.status, to: destination.droppableId }));
        return;
      }
  
      const updatedTask = {
        ...task,
        status: destination.droppableId
      };
      dispatch(updateTaskInList(updatedTask));
  
      dispatch(updateTaskStatus({
        taskId: task._id,
        status: destination.droppableId
      })).catch(error => {
        console.error("Status update failed:", error);
        dispatch(updateTaskInList(task));
      });
    }
  };

  // Status columns for kanban view
  const statusColumns = [
    { id: 'Available', title: t('taskBoard.available') },
    { id: 'Assigned', title: t('taskBoard.assigned') },
    { id: 'In Progress', title: t('taskBoard.inProgress') },
    { id: 'Completed', title: t('taskBoard.completed') },
    { id: 'Declined', title: t('taskBoard.declined') }
  ];

  // Status options for table filter
  const statusOptions = [
    t('taskBoard.all'),
    t('taskBoard.available'),
    t('taskBoard.assigned'),
    t('taskBoard.inProgress'),
    t('taskBoard.completed'),
    t('taskBoard.declined')
  ];

  // Pagination calculations
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, currentBuilding?._id]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Render kanban board view
  const renderKanbanView = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        <Row className="no-gutters">
          {statusColumns.map((column) => (
            <Col key={column.id} className="px-2">
              <div 
                className="kanban-column-header d-flex justify-content-between align-items-center p-3 mb-2 rounded"
                style={{ 
                  borderBottom: `3px solid var(--${getStatusColor(column.id)})`
                }}
              >
                <div className="d-flex align-items-center">
                  <h6 className="mb-0 font-weight-bold text-uppercase small">
                    {column.title} 
                    <Badge color="light" className="ml-2 text-dark">
                      {groupedTasks[column.id]?.length || 0}
                    </Badge>
                  </h6>
                </div>
                <Dropdown isOpen={dropdownOpen[column.id]} toggle={() => toggleDropdown(column.id)}>
                  <DropdownToggle tag="span" className="btn btn-sm btn-link text-muted">
                    <FaEllipsisH />
                  </DropdownToggle>
                  <DropdownMenu right>
                    {user?.role === 'SyndicateAdmin' && (
                      <DropdownItem onClick={() => {
                        setModal(true);
                        clearValidationErrors();
                      }}>
                        {t('taskBoard.createTask')}
                      </DropdownItem>
                    )}
                  </DropdownMenu>
                </Dropdown>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column ${snapshot.isDraggingOver ? 'kanban-column-dragging-over' : ''}`}
                  >
                    {groupedTasks[column.id]?.map((task, index) => (
                      <Draggable
                        key={task._id}
                        draggableId={task._id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card ${snapshot.isDragging ? 'kanban-card-dragging' : ''}`}
                          >
                            <Card
                              className={`border-left-${getStatusColor(task.status)} shadow-sm`}
                            >
                              <CardBody className="p-3">
                                {editingTask === task._id ? (
                                  <>
                                    <Label>{t('taskBoard.modalEditTitleLabel')}</Label>
                                    <Input
                                      type="text"
                                      className="task-title-input"
                                      value={editTaskData.title}
                                      onChange={(e) => setEditTaskData({...editTaskData, title: e.target.value})}
                                    />
                                    <Label>{t('taskBoard.modalEditDescriptionLabel')}</Label>
                                    <Input
                                      type="textarea"
                                      className="task-description-input"
                                      value={editTaskData.description}
                                      onChange={(e) => setEditTaskData({...editTaskData, description: e.target.value})}
                                    />
                                    <Label>{t('taskBoard.modalEditPriorityLabel')}</Label>
                                    <Input
                                      type="select"
                                      className="task-priority-input mt-2"
                                      value={editTaskData.priority}
                                      onChange={(e) => setEditTaskData({...editTaskData, priority: e.target.value})}
                                    >
                                      <option value="Low">{t('taskBoard.priorityLow')}</option>
                                      <option value="Medium">{t('taskBoard.priorityMedium')}</option>
                                      <option value="High">{t('taskBoard.priorityHigh')}</option>
                                      <option value="Critical">{t('taskBoard.priorityCritical')}</option>
                                    </Input>
                                    <div className="edit-controls">
                                      <Button 
                                        color="secondary" 
                                        size="sm" 
                                        onClick={cancelEditing}
                                      >
                                        {t('taskBoard.modalEditCancel')}
                                      </Button>
                                      <Button 
                                        color="primary" 
                                        size="sm" 
                                        onClick={() => handleUpdateTask(task._id)}
                                      >
                                        <FaSave className="mr-1" /> {t('taskBoard.modalEditSaveChanges')}
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <h6 
                                        className="card-title mb-1 font-weight-bold" 
                                        onClick={() => handleTaskSelect(task)}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        {task.title}
                                      </h6>
                                      <div className="d-flex align-items-center">
                                        {user?.role === 'SyndicateAdmin' && (
                                          <Dropdown 
                                            isOpen={dropdownOpen[task._id]} 
                                            toggle={() => toggleDropdown(task._id)}
                                            className="task-actions-dropdown"
                                          >
                                            <DropdownToggle tag="span" className="btn btn-sm btn-link text-muted">
                                              <FaEllipsisH />
                                            </DropdownToggle>
                                            <DropdownMenu right>
                                              <DropdownItem onClick={() => startEditing(task)}>
                                                <FaEdit className="mr-2" /> {t('taskBoard.tableEdit')}
                                              </DropdownItem>
                                              <DropdownItem onClick={() => handleDeleteClick(task)}>
                                                <FaTrash className="mr-2" /> {t('taskBoard.tableDelete')}
                                              </DropdownItem>
                                            </DropdownMenu>
                                          </Dropdown>
                                        )}
                                      </div>
                                    </div>
                                    <p 
                                      className="card-text text-muted small mb-2"
                                      onClick={() => handleTaskSelect(task)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {task.description.length > 80
                                        ? `${task.description.substring(0, 80)}...`
                                        : task.description}
                                    </p>
                                    <hr></hr>
                                    <div 
                                      className="d-flex justify-content-between align-items-center"
                                      onClick={() => handleTaskSelect(task)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <Badge color={getPriorityColor(task.priority)} pill className="text-uppercase justify-content-between">
                                        {t(`taskBoard.priority${task.priority}`)}
                                      </Badge>
                                      <div className="d-flex align-items-center">
                                        {task.assignedTo && (
                                          <span className="badge badge-light mr-1">
                                            <FaUser className="mr-1" />
                                            {task.assignedTo.firstName}
                                          </span>
                                        )}
                                        {task.comments?.length > 0 && (
                                          <span className="badge badge-light mr-1">
                                            <FaComment className="mr-1" />
                                            {task.comments.length}
                                          </span>
                                        )}
                                      </div>
                                      <Badge color={getStatusColor(task.status)} pill className="text-uppercase small">
                                        {t(`taskBoard.${task.status.replace(/\s/g, '').toLowerCase()}`)}
                                      </Badge>
                                    </div>
                                  </>
                                )}
                              </CardBody>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {user?.role === 'SyndicateAdmin' && currentBuilding && column.id === 'Available' && (
                      <Button 
                        color="light" 
                        block 
                        className="text-muted d-flex align-items-center justify-content-center py-2"
                        onClick={() => {
                          setModal(true);
                          clearValidationErrors();
                        }}
                      >
                        <FaPlus className="mr-2" /> {t('taskBoard.createTask')}
                      </Button>
                    )}
                  </div>
                )}
              </Droppable>
            </Col>
          ))}
        </Row>
      </div>
    </DragDropContext>
  );

  // Render table view
  const renderTableView = () => (
    <div>
      <Card className="mb-4 shadow-sm">
        <CardBody>
          <div className="mb-3 row align-items-end">
            <div className="col-md-3">
              <Label for="status-filter">{t('taskBoard.tableFilterByStatus')}</Label>
              <Input
                type="select"
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option === t('taskBoard.all') ? 'All' : option}>{option}</option>
                ))}
              </Input>
            </div>
            <div className="col-md-3">
              <Label for="entries-per-page">{t('taskBoard.tableShowEntries')}</Label>
              <Input
                type="select"
                id="entries-per-page"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="form-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Input>
            </div>
            <div className="col-md-6 text-end">
              <small className="text-muted">
                {t('taskBoard.tableShowEntries')} {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
              </small>
            </div>
          </div>
          <div className="table-responsive">
            <Table className="table-striped table-nowrap align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('taskBoard.tableTitle')}</th>
                  <th>{t('taskBoard.tableDescription')}</th>
                  <th>{t('taskBoard.tableStatus')}</th>
                  <th>{t('taskBoard.tablePriority')}</th>
                  <th>{t('taskBoard.tableBuilding')}</th>
                  <th>{t('taskBoard.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      {t('taskBoard.loading')}
                    </td>
                  </tr>
                ) : currentTasks.length > 0 ? (
                  currentTasks.map(task => (
                    <tr key={task._id}>
                      <td>{task.title}</td>
                      <td>{task.description?.length > 50 ? `${task.description.substring(0, 50)}...` : task.description}</td>
                      <td>
                        <span className={`badge bg-${getStatusColor(task.status)}`}>
                          {t(`taskBoard.${task.status.replace(/\s/g, '').toLowerCase()}`)}
                        </span>
                        {hasCurrentUserPendingRequest(task) && (
                          <span className="badge bg-info ms-2">{t('taskBoard.tableRequested')}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge bg-${getPriorityColor(task.priority)}`}>
                          {t(`taskBoard.priority${task.priority}`)}
                        </span>
                      </td>
                      <td>{task.building?.name}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            color="success"
                            size="sm"
                            onClick={() => handleTaskSelect(task)}
                          >
                            <FaEye className="text-white"/>
                          </Button>
                          {user?.role === 'Worker' && task.status === 'Available' && (
                            hasCurrentUserRejectedRequest(task) ? (
                              <Badge color="danger" className="ms-2">{t('taskBoard.declined')}</Badge>
                            ) : (
                              <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleRequestTask(task._id)}
                                disabled={hasRequestedTask(task)}
                              >
                                {hasRequestedTask(task) ? t('taskBoard.tableRequested') : t('taskBoard.tableRequest')}
                              </Button>
                            )
                          )}
                          {user?.role === 'SyndicateAdmin' && (
                            <>
                              <Button
                                color="warning"
                                size="sm"
                                onClick={() => startEditing(task)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => handleDeleteClick(task)}
                              >
                                <FaTrash />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      {filteredTasks.length === 0 ? t('taskBoard.noTasks') : t('taskBoard.noTasksOnPage')}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <small className="text-muted">
                  {t('taskBoard.page')} {currentPage} of {totalPages}
                </small>
              </div>
              <Pagination className="mb-0">
                <PaginationItem disabled={currentPage === 1}>
                  <PaginationLink
                    first
                    onClick={() => handlePageChange(1)}
                  />
                </PaginationItem>
                <PaginationItem disabled={currentPage === 1}>
                  <PaginationLink
                    previous
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                </PaginationItem>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum} active={currentPage === pageNum}>
                      <PaginationLink onClick={() => handlePageChange(pageNum)}>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem disabled={currentPage === totalPages}>
                  <PaginationLink
                    next
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </PaginationItem>
                <PaginationItem disabled={currentPage === totalPages}>
                  <PaginationLink
                    last
                    onClick={() => handlePageChange(totalPages)}
                  />
                </PaginationItem>
              </Pagination>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  return (
    <React.Fragment>
      <TaskAccessGuard>
        <div className="page-content">
          <Container fluid>
            <BreadCrumb title={t('taskBoard.title')} pageTitle={t('taskBoard.pageTitle')} />
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
                          <h4 className="fw-semibold mb-2">{t('taskBoard.title')}</h4>
                          <p className="text-muted mb-3">{t('taskBoard.welcomeCard')}</p>
                          <div className="d-flex flex-wrap gap-2">
                            {currentBuilding ? (
                              <Badge color="info" pill className="fs-12 py-2 px-3">
                                <FaBuilding className="me-1" /> {t('taskBoard.managing')}: {currentBuilding.name}
                              </Badge>
                            ) : (
                              <Badge color="primary" pill className="fs-12 py-2 px-3">
                                <FaBuilding className="me-1" /> {t('taskBoard.allProperties')}
                              </Badge>
                            )}
                            <Badge color="primary" pill className="fs-12 py-2 px-3">
                              <i className="ri-checkbox-blank-circle-line me-1"></i> {t('taskBoard.available')}: {availableTasks}
                            </Badge>
                            <Badge color="warning" pill className="fs-12 py-2 px-3">
                              <i className="ri-user-line me-1"></i> {t('taskBoard.assigned')}: {assignedTasks}
                            </Badge>
                            <Badge color="success" pill className="fs-12 py-2 px-3">
                              <i className="ri-check-double-line me-1"></i> {t('taskBoard.completed')}: {completedTasks}
                            </Badge>
                            <Badge color="danger" pill className="fs-12 py-2 px-3">
                              <i className="ri-close-circle-line me-1"></i> {t('taskBoard.declined')}: {declinedTasks}
                            </Badge>
                          </div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-end">
                          <div className="d-flex justify-content-end">
                            <Button color="success">
                              <FaCalendarAlt className="me-1" /> {t('taskBoard.calendar')}
                            </Button>
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
      <CardHeader className="nestly-card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <i className="ri-task-line text-primary fs-20 me-2"></i>
          <h4 className="mb-0 font-weight-bold">
            {viewMode === 'kanban' ? t('taskBoard.kanban') : t('taskBoard.table')}
            {currentBuilding && ` - ${currentBuilding.name}`}
          </h4>
        </div>
        <div className="d-flex gap-2">
          {(user?.role === 'SyndicateAdmin' || user?.role === 'Worker') && (
            <ButtonGroup>
              <Button
                color={viewMode === 'kanban' ? 'primary' : 'light'}
                onClick={() => setViewMode('kanban')}
              >
                <FaThLarge className="me-1" /> {t('taskBoard.kanban')}
              </Button>
              <Button
                color={viewMode === 'table' ? 'primary' : 'light'}
                onClick={() => setViewMode('table')}
              >
                <FaTable className="me-1" /> {t('taskBoard.table')}
              </Button>
            </ButtonGroup>
          )}
          {user?.role === 'SyndicateAdmin' && (
            <Button 
              color="success"
              onClick={() => {
                loadTaskRequests();
                setShowRequestsModal(true);
              }}
            >
              <FaListUl className="me-1" /> {t('taskBoard.viewRequests')}
            </Button>
          )}
          {user?.role === 'SyndicateAdmin' && currentBuilding && (
            <Button color="primary" onClick={() => {
              setModal(true);
              clearValidationErrors();
            }}>
              {t('taskBoard.createTask')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {viewMode === 'kanban' ? renderKanbanView() : renderTableView()}
      </CardBody>
    </Card>
  </Col>
</Row>
          </Container>

          {/* Create Task Modal */}
          <Modal isOpen={modal} toggle={() => {
            setModal(false);
            clearValidationErrors();
          }}>
            <ModalHeader toggle={() => {
              setModal(false);
              clearValidationErrors();
            }}>
              {t('taskBoard.modalCreateTitle')} {currentBuilding && `for ${currentBuilding.name}`}
            </ModalHeader>
            <ModalBody>
              <Form>
                <FormGroup>
                  <Label for="taskTitle">{t('taskBoard.modalCreateTitleLabel')}</Label>
                  <Input
                    type="text"
                    id="taskTitle"
                    value={newTask.title}
                    onChange={(e) => {
                      setNewTask({...newTask, title: e.target.value});
                      if (validationErrors.title) {
                        setValidationErrors(prev => ({ ...prev, title: null }));
                      }
                    }}
                    invalid={!!validationErrors.title}
                  />
                  {validationErrors.title && (
                    <div className="invalid-feedback d-block">
                      {validationErrors.title}
                    </div>
                  )}
                </FormGroup>
                <FormGroup>
                  <Label for="taskDescription">{t('taskBoard.modalCreateDescriptionLabel')}</Label>
                  <Input
                    type="textarea"
                    id="taskDescription"
                    value={newTask.description}
                    onChange={(e) => {
                      setNewTask({...newTask, description: e.target.value});
                      if (validationErrors.description) {
                        setValidationErrors(prev => ({ ...prev, description: null }));
                      }
                    }}
                    invalid={!!validationErrors.description}
                  />
                  {validationErrors.description && (
                    <div className="invalid-feedback d-block">
                      {validationErrors.description}
                    </div>
                  )}
                </FormGroup>
                <FormGroup>
                  <Label for="taskBuilding">{t('taskBoard.modalCreateBuildingLabel')}</Label>
                  <Input
                    type="text"
                    id="taskBuilding"
                    value={currentBuilding?.name || ''}
                    disabled
                    invalid={!!validationErrors.building}
                  />
                  {validationErrors.building && (
                    <div className="invalid-feedback d-block">
                      {validationErrors.building}
                    </div>
                  )}
                </FormGroup>
                <FormGroup>
                  <Label for="taskPriority">{t('taskBoard.modalCreatePriorityLabel')}</Label>
                  <Input
                    type="select"
                    id="taskPriority"
                    value={newTask.priority}
                    onChange={(e) => {
                      setNewTask({...newTask, priority: e.target.value});
                      if (validationErrors.priority) {
                        setValidationErrors(prev => ({ ...prev, priority: null }));
                      }
                    }}
                    invalid={!!validationErrors.priority}
                  >
                    <option value="">{t('taskBoard.modalCreatePriorityLabel')}</option>
                    <option value="Low">{t('taskBoard.priorityLow')}</option>
                    <option value="Medium">{t('taskBoard.priorityMedium')}</option>
                    <option value="High">{t('taskBoard.priorityHigh')}</option>
                    <option value="Critical">{t('taskBoard.priorityCritical')}</option>
                  </Input>
                  {validationErrors.priority && (
                    <div className="invalid-feedback d-block">
                      {validationErrors.priority}
                    </div>
                  )}
                </FormGroup>
                <div className="d-flex justify-content-end gap-2">
                  <Button color="secondary" onClick={() => {
                    setModal(false);
                    clearValidationErrors();
                  }}>
                    {t('taskBoard.modalCreateCancel')}
                  </Button>
                  <Button color="primary" onClick={handleCreateTask}>
                    {t('taskBoard.modalCreateSubmit')}
                  </Button>
                </div>
              </Form>
            </ModalBody>
          </Modal>

          {/* Edit Task Modal */}
          {viewMode === 'table' && (
            <Modal isOpen={!!editingTask} toggle={() => {
              cancelEditing();
              setEditValidationErrors({});
            }}>
              <ModalHeader toggle={() => {
                cancelEditing();
                setEditValidationErrors({});
              }}>
                {user?.role === 'SyndicateAdmin' ? t('taskBoard.modalEditTitleAdmin') : t('taskBoard.modalEditTitleWorker')}
              </ModalHeader>
              <ModalBody>
                <Form>
                  <FormGroup>
                    <Label for="editTaskTitle">{t('taskBoard.modalEditTitleLabel')}</Label>
                    <Input
                      type="text"
                      id="editTaskTitle"
                      value={editTaskData.title}
                      onChange={(e) => {
                        setEditTaskData({...editTaskData, title: e.target.value});
                        if (editValidationErrors.title) {
                          setEditValidationErrors(prev => ({ ...prev, title: null }));
                        }
                      }}
                      invalid={!!editValidationErrors.title}
                    />
                    {editValidationErrors.title && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.title}
                      </div>
                    )}
                  </FormGroup>
                  <FormGroup>
                    <Label for="editTaskDescription">{t('taskBoard.modalEditDescriptionLabel')}</Label>
                    <Input
                      type="textarea"
                      id="editTaskDescription"
                      value={editTaskData.description}
                      onChange={(e) => {
                        setEditTaskData({...editTaskData, description: e.target.value});
                        if (editValidationErrors.description) {
                          setEditValidationErrors(prev => ({ ...prev, description: null }));
                        }
                      }}
                      invalid={!!editValidationErrors.description}
                    />
                    {editValidationErrors.description && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.description}
                      </div>
                    )}
                  </FormGroup>
                  <FormGroup>
                    <Label for="editTaskPriority">{t('taskBoard.modalEditPriorityLabel')}</Label>
                    <Input
                      type="select"
                      id="editTaskPriority"
                      value={editTaskData.priority}
                      onChange={(e) => {
                        setEditTaskData({...editTaskData, priority: e.target.value});
                        if (editValidationErrors.priority) {
                          setEditValidationErrors(prev => ({ ...prev, priority: null }));
                        }
                      }}
                      invalid={!!editValidationErrors.priority}
                    >
                      <option value="">{t('taskBoard.modalEditPriorityLabel')}</option>
                      <option value="Low">{t('taskBoard.priorityLow')}</option>
                      <option value="Medium">{t('taskBoard.priorityMedium')}</option>
                      <option value="High">{t('taskBoard.priorityHigh')}</option>
                      <option value="Critical">{t('taskBoard.priorityCritical')}</option>
                    </Input>
                    {editValidationErrors.priority && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.priority}
                      </div>
                    )}
                  </FormGroup>
                  <div className="d-flex justify-content-end gap-2">
                    <Button color="secondary" onClick={() => {
                      cancelEditing();
                      setEditValidationErrors({});
                    }}>
                      {t('taskBoard.modalEditCancel')}
                    </Button>
                    <Button color="primary" onClick={() => handleUpdateTask(editingTask)}>
                      {t('taskBoard.modalEditSaveChanges')}
                    </Button>
                  </div>
                </Form>
              </ModalBody>
            </Modal>
          )}
          {/* Task Details Modal */}
          {selectedTask && (
            <Modal isOpen={!!selectedTask} toggle={() => dispatch(clearCurrentTask())} size="lg" className="modal-task">
              <ModalHeader toggle={() => dispatch(clearCurrentTask())}>
                <h5 className="mb-0">{t('taskBoard.modalDetailsTitle')}</h5>
              </ModalHeader>
              
              <ModalBody className="p-3">
                <Row className="g-3">
                  <Col lg={8}>
                    <div className="border rounded p-3 mb-3 bg-light">
                      <Row className="align-items-center">
                        <Col sm={6}>
                          <div className="d-flex align-items-center">
                            <FaBuilding className="text-muted me-2" />
                            <span className="fw-medium">{t('taskBoard.modalDetailsBuilding')}:</span>
                            <span className="ms-2">{selectedTask.building?.name}</span>
                          </div>
                        </Col>
                        <Col sm={6}>
                          <div className="d-flex align-items-center">
                            <FaCalendarAlt className="text-muted me-2" />
                            <span className="fw-medium">{t('taskBoard.modalDetailsCreated')}:</span>
                            <span className="ms-2">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                          </div>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col sm={6}>
                          <div className="d-flex align-items-center">
                            <FaExclamationTriangle className="text-muted me-2" />
                            <span className="fw-medium">{t('taskBoard.modalDetailsPriority')}:</span>
                            <Badge color={getPriorityColor(selectedTask.priority)} className="ms-2">
                              {t(`taskBoard.priority${selectedTask.priority}`)}
                            </Badge>
                          </div>
                        </Col>
                        <Col sm={6}>
                          <div className="d-flex align-items-center">
                            <FaSync className="text-muted me-2" />
                            <span className="fw-medium">{t('taskBoard.modalDetailsStatus')}:</span>
                            <Badge color={getStatusColor(selectedTask.status)} className="ms-2">
                              {t(`taskBoard.${selectedTask.status.replace(/\s/g, '').toLowerCase()}`)}
                            </Badge>
                          </div>
                        </Col>
                      </Row>
                    </div>

                    <div className="border rounded p-3 mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <FaFileAlt className="text-primary me-2" />
                        <h6 className="mb-0 fw-bold">{t('taskBoard.modalDetailsDescription')}</h6>
                      </div>
                      <p className="mb-0 text-muted">
                        {selectedTask.description || <em>{t('taskBoard.noDescription')}</em>}
                      </p>
                    </div>

                    <Row className="g-2 mb-3">
                      <Col sm={6}>
                        <div className="border rounded p-2 text-center">
                          <div className="d-flex align-items-center justify-content-center mb-1">
                            <div className="bg-success-subtle rounded-circle p-1 me-2">
                              <FaUser className="text-success fs-12" />
                            </div>
                            <small className="text-muted">{t('taskBoard.modalDetailsCreator')}</small>
                          </div>
                          <div className="fw-medium">
                            {selectedTask.createdBy?.firstName} {selectedTask.createdBy?.lastName}
                          </div>
                        </div>
                      </Col>
                      <Col sm={6}>
                        <div className="border rounded p-2 text-center">
                          <div className="d-flex align-items-center justify-content-center mb-1">
                            <div className="bg-warning-subtle rounded-circle p-1 me-2">
                              <FaUserCheck className="text-warning fs-12" />
                            </div>
                            <small className="text-muted">{t('taskBoard.modalDetailsAssignedTo')}</small>
                          </div>
                          <div className="fw-medium">
                            {selectedTask.assignedTo ? 
                              `${selectedTask.assignedTo.firstName} ${selectedTask.assignedTo.lastName}` : 
                              <em className="text-muted">{t('taskBoard.notAssigned')}</em>
                            }
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <div className="border rounded">
                      <div className="border-bottom p-2 bg-light">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <FaComment className="text-info me-2" />
                            <h6 className="mb-0">{t('taskBoard.modalDetailsComments')}</h6>
                          </div>
                          <Badge color="secondary">{selectedTask.comments?.length || 0}</Badge>
                        </div>
                      </div>
                      
                      <div className="p-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {selectedTask.comments?.length > 0 ? (
                          selectedTask.comments.map((comment, index) => (
                            <div key={index} className="d-flex mb-2 p-2 bg-light rounded">
                              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                                   style={{ width: '30px', height: '30px', minWidth: '30px' }}>
                                <span className="text-white fw-bold fs-12">
                                  {comment.createdBy?.firstName?.charAt(0)}{comment.createdBy?.lastName?.charAt(0)}
                                </span>
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="fw-medium">
                                    {comment.createdBy?.firstName} {comment.createdBy?.lastName}
                                  </small>
                                  <small className="text-muted">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </small>
                                </div>
                                <p className="mb-0 fs-13">{comment.text}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-3 text-muted">
                            <FaComment className="fs-24 mb-2" />
                            <p className="mb-0">{t('taskBoard.modalDetailsNoComments')}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="border-top p-2">
                        <div className="d-flex gap-2">
                          <Input
                            type="textarea"
                            placeholder={t('taskBoard.modalDetailsCommentPlaceholder')}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            rows={2}
                            size="sm"
                          />
                          <Button 
                            color="primary" 
                            size="sm"
                            onClick={handleAddComment}
                            disabled={!commentText.trim()}
                          >
                            <FaComment />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col lg={4}>
                    <div className="border rounded p-2 mb-3">
                      <h6 className="border-bottom pb-2 mb-2">
                        <FaInfoCircle className="me-2 text-muted" />
                        {t('taskBoard.modalDetailsQuickInfo')}
                      </h6>
                      <div className="row g-1 text-center">
                        <div className="col-6">
                          <small className="text-muted d-block">{t('taskBoard.modalDetailsCreated')}</small>
                          <small className="fw-medium">{new Date(selectedTask.createdAt).toLocaleDateString()}</small>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block">{t('taskBoard.modalDetailsUpdated')}</small>
                          <small className="fw-medium">{new Date(selectedTask.updatedAt).toLocaleDateString()}</small>
                        </div>
                      </div>
                    </div>

                    {user?.role === 'SyndicateAdmin' && selectedTask.status === 'Available' && (
                      <div className="border rounded p-2 mb-3">
                        <h6 className="border-bottom pb-2 mb-2 text-primary">
                          <FaUserPlus className="me-2" />
                          {t('taskBoard.modalDetailsAssignTask')}
                        </h6>
                        <Input
                          type="select"
                          value={selectedWorker}
                          onChange={(e) => setSelectedWorker(e.target.value)}
                          disabled={workersLoading}
                          size="sm"
                          className="mb-2"
                        >
                          <option value="">{t('taskBoard.selectWorker')}</option>
                          {workersLoading ? (
                            <option disabled>{t('taskBoard.loading')}</option>
                          ) : (
                            workers?.map(worker => (
                              <option key={worker._id} value={worker._id}>
                                {worker.firstName} {worker.lastName}
                              </option>
                            ))
                          )}
                        </Input>
                        <Button 
                          color="primary" 
                          size="sm" 
                          block
                          onClick={handleAssignTask}
                          disabled={!selectedWorker}
                        >
                          <FaUserPlus className="me-1" /> {t('taskBoard.modalDetailsAssignTask')}
                        </Button>
                      </div>
                    )}

                    {hasPendingAssignment(selectedTask) && (
                      <div className="border rounded p-2 mb-3 border-warning">
                        <h6 className="border-bottom pb-2 mb-2 text-warning">
                          <FaQuestionCircle className="me-2" />
                          {t('taskBoard.modalDetailsAssignmentRequest')}
                        </h6>
                        <p className="mb-2 fs-13 text-muted">{t('taskBoard.assignmentPending')}</p>
                        <div className="d-grid gap-1">
                          <Button 
                            color="success" 
                            size="sm"
                            onClick={() => handleRespondToAssignment('Accepted')}
                          >
                            <FaCheck className="me-1" /> {t('taskBoard.modalDetailsAccept')}
                          </Button>
                          <Button 
                            color="danger" 
                            size="sm"
                            onClick={() => handleRespondToAssignment('Declined')}
                          >
                            <FaTimes className="me-1" /> {t('taskBoard.modalDetailsDecline')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(user?.role === 'Worker' || user?.role === 'SyndicateAdmin') && (
                      <div className="border rounded p-2">
                        <h6 className="border-bottom pb-2 mb-2 text-info">
                          <FaSync className="me-2" />
                          {t('taskBoard.modalDetailsUpdateStatus')}
                        </h6>
                        <p className="mb-2 fs-13">
                          {t('taskBoard.current')}: <Badge color={getStatusColor(selectedTask.status)} className="ms-1">
                            {t(`taskBoard.${selectedTask.status.replace(/\s/g, '').toLowerCase()}`)}
                          </Badge>
                        </p>
                        <div className="d-grid gap-1">
                          {getAllowedStatuses(selectedTask.status, user.role).map(status => (
                            <Button
                              key={status}
                              color={getStatusColor(status)}
                              size="sm"
                              onClick={() => handleUpdateStatus(status)}
                            >
                              <FaSync className="me-1" />
                              {t(`taskBoard.${status.replace(/\s/g, '').toLowerCase()}`)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </ModalBody>
            </Modal>
          )}

          {/* Task Requests Modal */}
          <Modal isOpen={showRequestsModal} toggle={() => setShowRequestsModal(false)} size="lg">
            <ModalHeader toggle={() => setShowRequestsModal(false)}>
              {t('taskBoard.modalRequestsTitle')}
            </ModalHeader>
            <ModalBody>
              {loading ? (
                <div className="text-center">{t('taskBoard.loading')}</div>
              ) : taskRequests.length > 0 ? (
                <Nav tabs>
                  <NavItem>
                    <NavLink
                      className={activeTab === '1' ? 'active' : ''}
                      onClick={() => setActiveTab('1')}
                    >
                      {t('taskBoard.allRequests')}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === '2' ? 'active' : ''}
                      onClick={() => setActiveTab('2')}
                    >
                      {t('taskBoard.byTask')}
                    </NavLink>
                  </NavItem>
                </Nav>
              ) : null}
              
              <TabContent activeTab={activeTab}>
                <TabPane tabId="1">
                  <ListGroup>
                    {taskRequests.map(task => (
                      task.taskRequests
                        .filter(req => req.status === 'Pending')
                        .map((request, index) => (
                          <ListGroupItem key={`${task._id}-${index}`} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6>{task.title}</h6>
                                <p className="mb-1">{t('taskBoard.modalDetailsBuilding')}: {task.building?.name}</p>
                                <p className="mb-0">
                                  {t('taskBoard.requestedBy')}: {request.worker?.firstName} {request.worker?.lastName}
                                </p>
                              </div>
                              <div className="d-flex gap-2">
                                <Button 
                                  color="success" 
                                  size="sm"
                                  onClick={() => {
                                    handleRespondToTaskRequest({
                                      taskId: task._id,
                                      workerId: request.worker._id,
                                      response: 'Accepted'
                                    });
                                  }}
                                >
                                  <FaCheck /> {t('taskBoard.modalDetailsAccept')}
                                </Button>
                                <Button 
                                  color="danger" 
                                  size="sm"
                                  onClick={() => {
                                    handleRespondToTaskRequest({
                                      taskId: task._id,
                                      workerId: request.worker._id,
                                      response: 'Rejected'
                                    });
                                  }}
                                >
                                  <FaTimes /> {t('taskBoard.modalDetailsDecline')}
                                </Button>
                              </div>
                            </div>
                          </ListGroupItem>
                        ))
                    ))}
                  </ListGroup>
                </TabPane>
                <TabPane tabId="2">
                  {taskRequests.map(task => (
                    <Card key={task._id} className="mb-3">
                      <CardBody>
                        <h5>{task.title}</h5>
                        <p className="text-muted">{t('taskBoard.modalDetailsBuilding')}: {task.building?.name}</p>
                        <ListGroup>
                          {task.taskRequests
                            .filter(req => req.status === 'Pending')
                            .map((request, index) => (
                              <ListGroupItem key={index} className="d-flex justify-content-between align-items-center">
                                <div>
                                  {request.worker?.firstName} {request.worker?.lastName}
                                </div>
                                <div className="d-flex gap-2">
                                  <Button 
                                    color="success" 
                                    size="sm"
                                    onClick={() => {
                                      handleRespondToTaskRequest({
                                        taskId: task._id,
                                        workerId: request.worker._id,
                                        response: 'Accepted'
                                      });
                                    }}
                                  >
                                    {t('taskBoard.modalDetailsAccept')}
                                  </Button>
                                  <Button 
                                    color="danger" 
                                    size="sm"
                                    onClick={() => {
                                      handleRespondToTaskRequest({
                                        taskId: task._id,
                                        workerId: request.worker._id,
                                        response: 'Rejected'
                                      });
                                    }}
                                  >
                                    {t('taskBoard.modalDetailsDecline')}
                                  </Button>
                                </div>
                              </ListGroupItem>
                            ))}
                        </ListGroup>
                      </CardBody>
                    </Card>
                  ))}
                </TabPane>
              </TabContent>

              {!loading && taskRequests.length === 0 && (
                <div className="text-center py-4">
                  <p>{t('taskBoard.noPendingRequests')}</p>
                  <Button color="primary" onClick={() => setShowRequestsModal(false)}>
                    {t('taskBoard.modalCreateCancel')}
                  </Button>
                </div>
              )}
            </ModalBody>
          </Modal>

          {/* Delete Confirmation Modal */}
          <DeleteModal 
            show={deleteModal}
            onDeleteClick={handleDeleteConfirm}
            onCloseClick={handleDeleteCancel}
          />
        </div>
      </TaskAccessGuard>
    </React.Fragment>
  );
};

export default withTranslation()(TaskBoard);