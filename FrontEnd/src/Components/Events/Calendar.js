import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Card,
  Button,
  CardBody,
  Container,
  Form,
  FormFeedback,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Row,
  Col,
  ModalFooter,
  Badge,
  FormGroup,
  CardHeader,
  Alert,
  Spinner,
} from "reactstrap";
import { toast } from 'react-toastify';
import Select from "react-select";
import * as Yup from "yup";
import { useFormik } from "formik";
import FullCalendar from "@fullcalendar/react";
import EventPollManager from './pollingUiAdmin';
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import "./Calendar.css"; // Import custom styles for delegate events
import DeleteModal from "../../Components/Common/DeleteModal";
import listPlugin from '@fullcalendar/list';

// Import FullCalendar locales
import frLocale from '@fullcalendar/core/locales/fr';
import esLocale from '@fullcalendar/core/locales/es';
import itLocale from '@fullcalendar/core/locales/it';
import enLocale from '@fullcalendar/core/locales/en-gb';
import {
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  clearEvents,
  clearSuccessMessage,
  startMeeting as startMeetingAction,
  joinMeeting as joinMeetingAction,
  endMeeting as endMeetingAction,
  clearError,
} from "../../slices/Event/eventSlice";
import { fetchTasks } from "../../slices/Task/taskSlice";
import { fetchCoOwners } from "../../slices/buildings/building";
import { fetchBuildingCoOwners } from "../../slices/buildings/building";
import { useNavigate } from "react-router-dom";
import { withTranslation } from "react-i18next";
import "./calendar-style.css";
import calendarImage from "../../assets/images/Meeting.png"; // Import your calendar/meeting image
import { FaCalendarAlt } from "react-icons/fa";
import {
  hasVideoConferenceAccess,
  getMaxVideoConferenceDuration,
  getRemainingVideoConferenceTime
} from '../Subscriptions/SubcriptionValidator';
import api from "../../services/api";
import { useTranslation } from "react-i18next";
import ConflictAlertModal from "./modalofcolcnflict";

const Calendar = ({ t }) => {
  document.title = `${t('calendar.title')} | Nestleo`;

  const { i18n } = useTranslation();
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) return 'image-line';
    if (['pdf'].includes(extension)) return 'file-pdf-line';
    if (['doc', 'docx'].includes(extension)) return 'file-word-line';
    if (['xls', 'xlsx'].includes(extension)) return 'file-excel-line';
    if (['ppt', 'pptx'].includes(extension)) return 'file-ppt-line';
    return 'file-text-line';
  };
  // Function to get the appropriate FullCalendar locale based on current language
  const getCalendarLocale = () => {
    const currentLanguage = i18n.language;
    const localeMap = {
      'fr': frLocale,
      'sp': esLocale,
      'es': esLocale,
      'it': itLocale,
      'en': enLocale
    };
    return localeMap[currentLanguage] || enLocale; // Default to English if language not found
  };
  const [eventPolls, setEventPolls] = useState([]);

  const dispatch = useDispatch();
  const [conflictModal, setConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(null);

  const navigate = useNavigate();
  const { events = [], loading, error, successMessage ,conflictingEvent } = useSelector((state) => state.events || {});
  const { tasks = [] } = useSelector((state) => state.task || {});
  const { user } = useSelector((state) => state.Loginn || {});
  const { coOwners = [] } = useSelector((state) => state.Building || {});
  const [event, setEvent] = useState({});
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [startingMeeting, setStartingMeeting] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  // Add state for coowner selection
  const [selectedCoOwners, setSelectedCoOwners] = useState([]);
  const [isForAllCoOwners, setIsForAllCoOwners] = useState(true);
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const toastShownRef = useRef({}); // Track which toasts have been shown to avoid duplicates
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to force re-render of FullCalendar when language changes
  const [calendarKey, setCalendarKey] = useState(0);


  // Add state for bloc and apartment selection
  const [selectedBlocs, setSelectedBlocs] = useState([]);
  const [selectedApartments, setSelectedApartments] = useState([]);
  const [eventTargetType, setEventTargetType] = useState('all'); // 'all', 'blocs', or 'apartments'
  const [availableBlocs, setAvailableBlocs] = useState([]);
  const [availableApartments, setAvailableApartments] = useState([]);


  // Calculate statistics for welcome card
  const totalEvents = events.length;
  const activeMeetings = events.filter(event => event.meeting?.isActive).length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === "Completed").length;



  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentDescriptions, setDocumentDescriptions] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  // Add this to your state variables section:
  const [availablePolls, setAvailablePolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedPolls, setSelectedPolls] = useState([]); // Change from selectedPoll to selectedPolls array

  // Add these state variables at the top of your component
  const [detachPollLoading, setDetachPollLoading] = useState(false);
  const [detachConfirmModal, setDetachConfirmModal] = useState(false);
  const [pollToDetach, setPollToDetach] = useState(null);
 useEffect(() => {
    // Check for conflicts
    if (error && conflictingEvent) {
      setConflictDetails({
        message: error.message,
        event: conflictingEvent
      });
      setConflictModal(true);
      
      // Clear the error
      dispatch(clearError());
    }
  }, [error, conflictingEvent, dispatch]);

  // Add this function to handle poll detachment
  const handleDetachPoll = async (pollId) => {
    try {
      setDetachPollLoading(true);

      const response = await api.post(`/api/polls/${pollId}/detach`);

      toast.success(t('calendar.pollDetachedSuccess'));

      // Refresh polls list
      if (event?._id) {
        fetchEventPolls(event._id);
      }

      // Also refresh available standalone polls if we're in edit mode
      if (editModal && currentBuilding?._id) {
        try {
          const standaloneResponse = await api.get(`/api/polls/building/${currentBuilding._id}/standalone`);
          setAvailablePolls(standaloneResponse.data);
        } catch (error) {
          console.error('Error refreshing standalone polls:', error);
        }
      }

      setDetachConfirmModal(false);
      setPollToDetach(null);
    } catch (error) {
      console.error('Error detaching poll:', error);
      toast.error(t('calendar.pollDetachError'));
    } finally {
      setDetachPollLoading(false);
    }
  };

  // Add this function to open the confirmation modal
  const confirmDetachPoll = (poll) => {
    setPollToDetach(poll);
    setDetachConfirmModal(true);
  };



  useEffect(() => {
    const fetchStandalonePolls = async () => {
      if (currentBuilding?._id && (modal || editModal)) {
        try {
          const response = await api.get(`/api/polls/building/${currentBuilding._id}/standalone`);
          setAvailablePolls(response.data);

          // If in edit mode, also fetch the event's existing polls
          if (editModal && event?._id) {
            const eventPollsResponse = await api.get(`/api/polls/events/${event._id}/polls`);
            if (Array.isArray(eventPollsResponse.data)) {
              setSelectedPolls(eventPollsResponse.data.map(poll => poll._id));
            }
          }
        } catch (error) {
          console.error('Error fetching standalone polls:', error);
        }
      }
    };

    fetchStandalonePolls();
  }, [currentBuilding?._id, modal, editModal, event?._id]);

  // Add this handler
  const handlePollSelection = (pollId) => {
    setSelectedPoll(pollId);
  };

  const togglePollSelection = (pollId) => {
    setSelectedPolls(prevSelectedPolls => {
      if (prevSelectedPolls.includes(pollId)) {
        // Remove poll if already selected
        return prevSelectedPolls.filter(id => id !== pollId);
      } else {
        // Add poll if not selected
        return [...prevSelectedPolls, pollId];
      }
    });
  };
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    // Initialize descriptions array
    setDocumentDescriptions(new Array(files.length).fill(''));
  };

  const handleDocumentDescriptionChange = (index, value) => {
    const newDescriptions = [...documentDescriptions];
    newDescriptions[index] = value;
    setDocumentDescriptions(newDescriptions);
  };

  const removeSelectedFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newDescriptions = documentDescriptions.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setDocumentDescriptions(newDescriptions);
  };

  const downloadDocument = async (eventId, documentId, fileName) => {
    try {
      const response = await api.get(`/api/events/${eventId}/documents/${documentId}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(t('calendar.documentDownloaded'));
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(t('calendar.documentDownloadFailed'));
    }
  };
  const formatDate = (dateValue) => {
    if (!dateValue) return '';

    try {
      // If it's already a Date object
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString();
      }

      // If it's a string, convert to Date first
      return new Date(dateValue).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return String(dateValue); // Return as string if can't be formatted
    }
  };
  const deleteDocument = async (eventId, documentId) => {
    try {
      await api.delete(`/api/events/${eventId}/documents/${documentId}`);
      toast.success(t('calendar.documentDeleted'));

      // Update the local event state immediately
      setEvent(prevEvent => ({
        ...prevEvent,
        documents: prevEvent.documents?.filter(doc => doc._id !== documentId) || []
      }));

      // Refresh the event data in the background
      if (currentBuilding?._id) {
        dispatch(fetchEvents(currentBuilding._id));
      }


    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(t('calendar.documentDeleteFailed'));
    }
  };
  // Add this state to track documents to be removed
  const [documentsToRemove, setDocumentsToRemove] = useState([]);

  // Function to mark a document for removal
  const markDocumentForRemoval = (documentId) => {
    setDocumentsToRemove(prev => [...prev, documentId]);
  };
  useEffect(() => {
    if (user?.role === 'SyndicateAdmin' || user?.role === 'SyndicateCoowner') {
      if (currentBuilding?._id) {
        dispatch(fetchEvents(currentBuilding._id))
          .unwrap()
          .catch(err => {
            console.error("Event fetch failed:", err);
            dispatch(clearSuccessMessage());
          });

        // Fetch coowners for the current building
        dispatch(fetchCoOwners(currentBuilding._id))
          .unwrap()
          .catch(err => {
            console.error("CoOwners fetch failed:", err);
          });
      } else {
        dispatch(clearEvents());
      }
    } else {
      dispatch(clearEvents());
    }

    if (user?.role === 'SyndicateAdmin' || user?.role === 'Worker' || user?.role === 'SyndicateCoowner') {
      dispatch(fetchTasks())
        .unwrap()
        .catch(err => {
          console.error("Task fetch failed:", err);
        });
    }

    // Reset toast tracking on component mount
    toastShownRef.current = {};
  }, [dispatch, currentBuilding?._id, user?.role]);

  // Effect to re-render FullCalendar when language changes
  useEffect(() => {
    setCalendarKey(prev => prev + 1);
  }, [i18n.language]);

  // Add this function to fetch polls for a specific event
  const fetchEventPolls = async (eventId) => {
    try {
      const response = await api.get(`/api/polls/events/${eventId}/polls`);
      setEventPolls(response.data || []);
    } catch (error) {
      console.error('Error fetching event polls:', error);
    }
  };


  // Add these validation functions at the top of your component
  const validateTitle = (value) => {
    if (!value || value.trim() === '') {
      return t('calendar.errors.titleRequired');
    }
    return null;
  };

  const validateLocation = (value) => {
    if (value && value.trim() === '') {
      return t('calendar.errors.locationNotEmpty');
    }
    return null;
  };

  const validateDescription = (value) => {
    if (value && value.trim() === '') {
      return t('calendar.errors.descriptionNotEmpty');
    }
    return null;
  };

  // Add these state variables to track field errors
  const [fieldErrors, setFieldErrors] = useState({
    title: null,
    location: null,
    description: null,
    eventTime: null,
    endTime: null
  });
  // Add this function to your Calendar component
  const detectTimeConflict = (newEventStart, newEventTime, newEventEndTime, existingEvents) => {
    if (!newEventStart || !newEventTime || !newEventEndTime) return false;

    // Convert event times to Date objects for proper comparison
    const newEventDate = new Date(newEventStart);
    const [newStartHour, newStartMinute] = newEventTime.split(':').map(Number);
    const [newEndHour, newEndMinute] = newEventEndTime.split(':').map(Number);

    // Set the hours and minutes for the new event's start time
    const newEventStartDateTime = new Date(newEventDate);
    newEventStartDateTime.setHours(newStartHour, newStartMinute, 0, 0);

    // Set the hours and minutes for the new event's end time
    const newEventEndDateTime = new Date(newEventDate);
    newEventEndDateTime.setHours(newEndHour, newEndMinute, 0, 0);

    // Filter out task items as they don't have time conflicts
    const eventsOnSameDay = existingEvents.filter(event => {
      // Skip task items and the event being edited
      if (event.extendedProps?.type === 'task' || (isEdit && event._id === event._id)) {
        return false;
      }

      // Check if the event is on the same day
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === newEventDate.toDateString();
    });

    // Check for conflicts with each existing event
    for (const existingEvent of eventsOnSameDay) {
      // Skip if event has no time information
      if (!existingEvent.eventTime) continue;

      // Parse existing event times
      let existingStartTime, existingEndTime;

      try {
        // Extract time components from the existing event
        const [existingStartHour, existingStartMinute] = existingEvent.eventTime.split(':').map(Number);

        // Create Date objects for the existing event times
        const existingEventDate = new Date(existingEvent.start);
        existingStartTime = new Date(existingEventDate);
        existingStartTime.setHours(existingStartHour, existingStartMinute, 0, 0);

        // Handle end time - use either specified endTime or add 1 hour as default
        if (existingEvent.endTime) {
          const [existingEndHour, existingEndMinute] = existingEvent.endTime.split(':').map(Number);
          existingEndTime = new Date(existingEventDate);
          existingEndTime.setHours(existingEndHour, existingEndMinute, 0, 0);
        } else {
          existingEndTime = new Date(existingStartTime);
          existingEndTime.setHours(existingStartTime.getHours() + 1);
        }

        // Check for time overlap
        // Conflict if: new event starts during existing event OR new event ends during existing event
        // OR new event completely contains existing event OR existing event completely contains new event
        if (
          (newEventStartDateTime >= existingStartTime && newEventStartDateTime < existingEndTime) ||
          (newEventEndDateTime > existingStartTime && newEventEndDateTime <= existingEndTime) ||
          (newEventStartDateTime <= existingStartTime && newEventEndDateTime >= existingEndTime) ||
          (newEventStartDateTime >= existingStartTime && newEventEndDateTime <= existingEndTime)
        ) {
          return {
            hasConflict: true,
            conflictingEvent: existingEvent
          };
        }
      } catch (error) {
        console.error('Error checking time conflict:', error);
        continue;
      }
    }

    return { hasConflict: false };
  };
  // Add these handler functions
  const handleEventTargetTypeChange = (type) => {
    setEventTargetType(type);

    // Reset selections when changing type
    if (type === 'all') {
      setSelectedBlocs([]);
      setSelectedApartments([]);
      setIsForAllCoOwners(true);
    } else {
      setIsForAllCoOwners(false);
    }
  };

  const handleBlocSelection = (blocIds) => {
    setSelectedBlocs(blocIds);

    // Clear apartment selection when blocs change
    if (eventTargetType === 'blocs') {
      setSelectedApartments([]);
    }
  };

  const handleApartmentSelection = (apartmentIds) => {
    setSelectedApartments(apartmentIds);
  };
  // Add this function to handle clicks on upcoming events
  const handleUpcomingEventClick = async (eventId) => {
    try {
      // Find the clicked event in calendarItems
      const clickedEvent = calendarItems.find(e => e._id === eventId);

      if (!clickedEvent) {
        console.error("Event not found:", eventId);
        return;
      }

      // Fetch full event details with populated data
      const fullEventData = await fetchEventDetails(eventId);

      if (fullEventData) {
        const fullEvent = {
          ...fullEventData,
          _id: eventId,
          id: clickedEvent.id,
          start: clickedEvent.start,
          extendedProps: {
            isDelegate: clickedEvent.extendedProps?.isDelegate,
            delegatorName: clickedEvent.extendedProps?.delegatorName,
            delegatorId: clickedEvent.extendedProps?.delegatorId
          }
        };
        setEvent(fullEvent);
      } else {
        // Fallback to original method if API call fails
        const originalEvent = calendarItems.find(e => e._id === eventId);
        const fullEvent = {
          _id: eventId,
          id: clickedEvent.id,
          title: clickedEvent.title,
          start: clickedEvent.start,
          eventTime: clickedEvent.eventTime || "",
          endtime: clickedEvent.endtime || "",
          className: clickedEvent.className || "",
          category: clickedEvent.className || "",
          location: clickedEvent.location || "",
          description: clickedEvent.description || "",
          type: clickedEvent.type,
          status: clickedEvent.status,
          priority: clickedEvent.priority,
          assignedTo: clickedEvent.assignedTo,
          meeting: originalEvent?.meeting || null,
          building: originalEvent?.building || null,
          user: originalEvent?.user || null,
          createdBy: originalEvent?.createdBy || originalEvent?.user || null,
          isForAllCoOwners: originalEvent?.isForAllCoOwners,
          selectedBlocs: originalEvent?.selectedBlocs || [],
          selectedApartments: originalEvent?.selectedApartments || [],
          documents: originalEvent?.documents || [],
          extendedProps: {
            isDelegate: clickedEvent.extendedProps?.isDelegate,
            delegatorName: clickedEvent.extendedProps?.delegatorName,
            delegatorId: clickedEvent.extendedProps?.delegatorId
          }
        };
        setEvent(fullEvent);
      }

      setDetailsModal(true);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error(t('calendar.errorLoadingEventDetails'));
    }
  };
  // When blocs are selected, fetch the apartments in those blocs
  useEffect(() => {
    const fetchApartmentsInBlocs = async () => {
      if (selectedBlocs.length > 0 && eventTargetType === 'blocs') {
        try {
          const response = await api.get(`/api/Building/blocsAppartments/${selectedBlocs.join(',')}/apartments`);
          setAvailableApartments(response.data || []);
        } catch (error) {
          console.error('Error fetching apartments for blocs:', error);
        }
      } else if (currentBuilding?._id && eventTargetType === 'apartments') {
        // If in apartment selection mode, fetch all apartments again
        try {
          const apartmentsResponse = await api.get(`/api/Building/${currentBuilding._id}/apartments/all`);
          setAvailableApartments(apartmentsResponse.data || []);
        } catch (error) {
          console.error('Error fetching all apartments:', error);
        }
      }
    };

    fetchApartmentsInBlocs();
  }, [selectedBlocs, eventTargetType, currentBuilding]);

  // Add this useEffect to fetch blocs and apartments when a building is selected
  useEffect(() => {
    const fetchBuildingData = async () => {
      if (currentBuilding?._id) {
        try {
          // Fetch blocs
          const blocsResponse = await api.get(`/api/Building/${currentBuilding._id}/blocs`);
          setAvailableBlocs(blocsResponse.data || []);

          // Fetch all apartments
          const apartmentsResponse = await api.get(`/api/Building/${currentBuilding._id}/apartments/all`);
          setAvailableApartments(apartmentsResponse.data || []);
        } catch (error) {
          console.error('Error fetching building data:', error);
        }
      }
    };

    fetchBuildingData();
  }, [currentBuilding]);




  const formattedTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];

    if (user?.role === 'Worker') {
      return tasks
        .filter(task => task.assignedTo?._id === user._id || task.assignedTo === user._id)
        .map(task => ({
          _id: task._id,
          title: `[${t('calendar.task')}] ${task.title}`,
          start: new Date(task.createdAt),
          className: 'bg-soft-info',
          editable: false,
          extendedProps: {
            _id: task._id,
            type: 'task',
            status: task.status,
            priority: task.priority,
            description: task.description,
            assignedTo: task.assignedTo,
            location: task.building?.name || t('calendar.notSpecified'),
            eventTime: new Date(task.createdAt).toLocaleTimeString()
          }
        }));
    }

    return tasks
      .filter(task => !currentBuilding?._id || task.building?._id === currentBuilding._id || task.building === currentBuilding._id)
      .map(task => ({
        _id: task._id,
        title: `[${t('calendar.task')}] ${task.title}`,
        start: new Date(task.createdAt),
        className: 'bg-soft-info',
        editable: false,
        extendedProps: {
          _id: task._id,
          type: 'task',
          status: task.status,
          priority: task.priority,
          description: task.description,
          assignedTo: task.assignedTo,
          location: task.building?.name || t('calendar.notSpecified'),
          eventTime: new Date(task.createdAt).toLocaleTimeString()
        }
      }));
  }, [tasks, currentBuilding?._id, user?._id, user?.role, t]);

  const calendarItems = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    if (user?.role === 'Worker') {
      return [...formattedTasks];
    }

    // Process events to add delegate information
    const processedEvents = safeEvents.map(event => {
      const processedEvent = { ...event };

      // If this is a delegate event, modify the title and add delegate info
      if (event.delegateInfo?.isDelegate) {
        processedEvent.title = `[${t('calendar.delegate') || 'Delegate'}] ${event.title}`;
        processedEvent.className = event.className + ' delegate-event';
        processedEvent.extendedProps = {
          ...processedEvent.extendedProps,
          isDelegate: true,
          delegatorName: event.delegateInfo.delegatorName,
          delegatorId: event.delegateInfo.delegatorId
        };
      }

      return processedEvent;
    });

    return [...processedEvents, ...formattedTasks];
  }, [events, formattedTasks, user?.role, t]);
  const handleFieldBlur = (field, value) => {
    let error = null;

    switch (field) {
      case 'title':
        error = validateTitle(value);
        break;
      case 'location':
        error = validateLocation(value);
        break;
      case 'description':
        error = validateDescription(value);
        break;
      default:
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      title: event?.title || "",
      category: event?.className || "bg-soft-danger",
      location: event?.location || "",
      description: event?.description || "",
      building: event?.building || "",
      start: event?.start ? (typeof event.start === 'string' ? new Date(event.start) : event.start) : selectedDay || "",
      eventTime: event?.eventTime || "",
      endTime: event?.endTime || "",
    },
    validationSchema: Yup.object({
      title: Yup.string()
        .required(t('calendar.validationTitleRequired'))
        .matches(/^[a-zA-Z0-9\s]*$/, t('calendar.errors.titleNoSpecialChars'))
        .test('not-only-spaces', t('calendar.errors.titleNotOnlySpaces'), value => value && value.trim() !== '')
        .min(3, t('calendar.errors.titleTooShort'))
        .max(100, t('calendar.errors.titleTooLong')),
      category: Yup.string().required(t('calendar.validationCategoryRequired')),
      start: Yup.date()
        .required(t('calendar.validationStartRequired'))
        .min(
          new Date(new Date().setHours(0, 0, 0, 0)),
          t('calendar.errors.pastDateNotAllowed')
        ),
      eventTime: Yup.string()
        .required(t('calendar.validationEventTimeRequired'))
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, t('calendar.errors.invalidEventTime'))
        .test('not-only-spaces', t('calendar.errors.eventTimeNotOnlySpaces'), value => value && value.trim() !== ''),
      endTime: Yup.string()
        .required(t('calendar.validationEndTimeRequired'))
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, t('calendar.errors.invalidEndTime'))
        .test('not-only-spaces', t('calendar.errors.endTimeNotOnlySpaces'), value => value && value.trim() !== '')
        .test('end-time-after-start', t('calendar.errors.endTimeAfterStart'), function (value) {
          const { eventTime } = this.parent;
          if (!eventTime || !value) return true; // Skip if either time is not provided
          const [startHour, startMinute] = eventTime.split(':').map(Number);
          const [endHour, endMinute] = value.split(':').map(Number);
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          return endTotalMinutes > startTotalMinutes;
        }),
      location: Yup.string()
        .test('not-only-spaces', t('calendar.errors.locationNotOnlySpaces'), value => !value || value.trim() !== '')
        .max(200, t('calendar.errors.locationTooLong')),
      description: Yup.string()
        .test('not-only-spaces', t('calendar.errors.descriptionNotOnlySpaces'), value => !value || value.trim() !== '')
        .max(500, t('calendar.errors.descriptionTooLong')),
    }),
    onSubmit: async (values) => {
      if (user.role === "SyndicateCoowner" || user.role === "Worker") {
        toast.error(t('calendar.noPermission'));
        return;
      }
      if (!currentBuilding?._id) {
        toast.error(t('calendar.noBuildingSelected'));
        return;
      }

      // Check for time conflicts
      const conflict = detectTimeConflict(
        values.start,
        values.eventTime,
        values.endTime,
        calendarItems
      );

      if (conflict.hasConflict) {
        // Show conflict error with details of the conflicting event
        toast.error(
          <>
            <div><strong>{t('calendar.timeConflict')}</strong></div>
            <div>{t('calendar.conflictsWith')}: {conflict.conflictingEvent.title}</div>
            <div>{t('calendar.at')}: {conflict.conflictingEvent.eventTime}</div>
          </>
        );
        return;
      }

      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('start', values.start.toISOString());
      formData.append('eventTime', values.eventTime);
      formData.append('className', values.category);
      formData.append('location', values.location);
      formData.append('description', values.description);
      formData.append('building', currentBuilding._id);
      formData.append('endtime', values.endTime);
      formData.append('user', user._id);
      formData.append('isForAllCoOwners', eventTargetType === 'all');

      selectedBlocs.forEach(blocId => formData.append('selectedBlocs', blocId));
      selectedApartments.forEach(apartmentId => formData.append('selectedApartments', apartmentId));

      selectedFiles.forEach((file, index) => {
        formData.append('documents', file);
        formData.append('documentDescriptions', documentDescriptions[index] || '');
      });

      // Add documents to remove if editing
      if (isEdit && documentsToRemove && documentsToRemove.length > 0) {
        documentsToRemove.forEach(docId => {
          formData.append('removeDocuments', docId);
        });
      }

      // Debug - log what's in formData
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
      try {
        let eventId;
        if (isEdit) {
          if (!event._id) {
            throw new Error(t('calendar.eventIdMissing'));
          }
          eventId = event._id;

          console.log(`Dispatching updateEvent with ID: ${event._id}`);
          const result = await dispatch(updateEvent({
            id: event._id,
            eventData: formData
          })).unwrap();

          console.log("Update result:", result);
          toast.success(t('calendar.eventUpdated'));
        } else {
          await dispatch(addEvent(formData)).unwrap();
          toast.success(t('calendar.eventAdded'));
        }
        // If a poll is selected, attach it to the event
        if (selectedPoll && eventId) {
          try {
            await api.post(`/api/polls/${selectedPoll}/attach/${eventId}`);
            toast.success(t('calendar.pollAttached'));
          } catch (pollError) {
            console.error('Error attaching poll to event:', pollError);
            toast.error(t('calendar.pollAttachError'));
          }
        }
        if (selectedPolls.length > 0) {
          let successCount = 0;
          let errorCount = 0;

          // Process each selected poll
          for (const pollId of selectedPolls) {
            try {
              console.log(`Attaching poll ${pollId} to event ${eventId}`);
              await api.post(`/api/polls/${pollId}/attach/${eventId}`);
              successCount++;
            } catch (pollError) {
              console.error(`Error attaching poll ${pollId} to event:`, pollError);
              errorCount++;
            }
          }

          if (successCount > 0) {
            if (errorCount > 0) {
              toast.warning(t('calendar.somePolls', { success: successCount, error: errorCount }));
            } else {
              toast.success(t('calendar.pollsAttached', { count: successCount }));
            }
          } else if (errorCount > 0) {
            toast.error(t('calendar.pollAttachError'));
          }

          // Refresh event polls to show the newly attached polls
          if (eventId) {
            await fetchEventPolls(eventId);
          }
        }
        resetFormAndCloseModals();
        setSelectedPoll(null); // Reset selected poll
      } catch (error) {
        console.error('Event submission error:', error);
        toast.error(t('calendar.errorEventSubmission'));
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const resetFormAndCloseModals = () => {
    setModal(false);
    setEditModal(false);
    setDetailsModal(false);
    setIsEdit(false);
    setSelectedPolls([]);
    setEvent({});
    setSelectedDay(null);
    setSelectedCoOwners([]);
    setIsForAllCoOwners(true);
    setEventTargetType('all');
    setSelectedBlocs([]);
    setSelectedApartments([]);
    setSelectedFiles([]);
    setDocumentDescriptions([]);
    setDocumentsToRemove([]);
    validation.resetForm();
  };
  const toggleEditModal = () => {
    if (editModal) {
      setIsEdit(false);
      setEvent({});
      validation.resetForm();
    }
    setEditModal(!editModal);
  };

  const toggleDetailsModal = () => {
    if (!detailsModal) {
      setDetailsModal(true);
      fetchEventPolls(event._id);

    } else {
      setDetailsModal(false);
      if (!isEdit) {
        setEvent({});
      }
    }
  };

  const handleDateClick = (arg) => {
    if (user.role === "SyndicateCoowner" || user.role === "Worker") return;
    if (!currentBuilding?._id) {
      toast.error(t('calendar.noBuildingSelected'));
      return;
    }
    setSelectedDay(arg.date);
    setEvent({});
    setIsEdit(false);
    setSelectedCoOwners([]);
    setIsForAllCoOwners(true);
    validation.resetForm();
    validation.setValues({
      title: "",
      category: "bg-soft-primary",
      start: arg.date,
      eventTime: "",
      location: "",
      description: "",
    });
    setModal(true);
  };

  const handleDeleteEvent = async () => {
    if (user.role === "SyndicateCoowner" || user.role === "Worker") {
      toast.error(t('calendar.noPermissionDelete'));
      return;
    }
    if (!event._id) {
      console.error(t('calendar.eventIdMissing'));
      toast.error(t('calendar.eventIdMissingDelete'));
      return;
    }
    try {
      await dispatch(deleteEvent(event._id)).unwrap();
      toast.success(t('calendar.eventDeleted'));
      setDeleteModal(false);
      resetFormAndCloseModals();
    } catch (err) {
      console.error("Delete event failed:", err);
      toast.error(t('calendar.eventDeleteFailed'));
    }
  };

  const toggle = () => {
    if (modal) {
      resetFormAndCloseModals();
    } else {
      if (!currentBuilding?._id) {
        toast.error(t('calendar.noBuildingSelected'));
        return;
      }
      setModal(true);
    }
  };


  const fetchEventDetails = async (eventId) => {
    try {
      const response = await api.get(`/api/events/single/${eventId}`);
      const eventData = response.data;
      setEvent(eventData);

      // Also fetch the polls associated with this event
      fetchEventPolls(eventId);

      return eventData;
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error(t('calendar.errors.fetchEventFailed'));
      return null;
    }
  };

  // Update the handleEventClick function to fetch full event details:
  const handleEventClick = async (arg) => {
    const clickedEvent = arg.event;
    const eventId = clickedEvent.extendedProps._id;

    // Fetch full event details with populated data
    const fullEventData = await fetchEventDetails(eventId);

    // Fetch polls for this event
    fetchEventPolls(eventId);
    if (fullEventData) {
      const fullEvent = {
        ...fullEventData,
        _id: eventId,
        id: clickedEvent.id,
        start: clickedEvent.start,
        extendedProps: {
          isDelegate: clickedEvent.extendedProps?.isDelegate,
          delegatorName: clickedEvent.extendedProps?.delegatorName,
          delegatorId: clickedEvent.extendedProps?.delegatorId
        }
      };
      setEvent(fullEvent);
    } else {
      // Fallback to original method if API call fails
      const originalEvent = calendarItems.find(e => e._id === eventId);
      const fullEvent = {
        _id: eventId,
        id: clickedEvent.id,
        title: clickedEvent.title,
        start: clickedEvent.start,
        eventTime: clickedEvent.extendedProps?.eventTime || "",
        endtime: clickedEvent.extendedProps?.endtime || "",
        className: clickedEvent.classNames[0] || "",
        category: clickedEvent.classNames[0] || "",
        location: clickedEvent.extendedProps?.location || "",
        description: clickedEvent.extendedProps?.description || "",
        type: clickedEvent.extendedProps?.type,
        status: clickedEvent.extendedProps?.status,
        priority: clickedEvent.extendedProps?.priority,
        assignedTo: clickedEvent.extendedProps?.assignedTo,
        meeting: originalEvent?.meeting || null,
        building: originalEvent?.building || null,
        user: originalEvent?.user || null,
        createdBy: originalEvent?.createdBy || originalEvent?.user || null,
        isForAllCoOwners: originalEvent?.isForAllCoOwners,
        selectedBlocs: originalEvent?.selectedBlocs || [],
        selectedApartments: originalEvent?.selectedApartments || [],
        documents: originalEvent?.documents || [],
        extendedProps: {
          isDelegate: clickedEvent.extendedProps?.isDelegate,
          delegatorName: clickedEvent.extendedProps?.delegatorName,
          delegatorId: clickedEvent.extendedProps?.delegatorId
        }
      };
      setEvent(fullEvent);
    }

    setDetailsModal(true);
  };

  const handleEditButtonClick = async () => {
    setDetailsModal(false);
    setIsEdit(true);

    // Ensure we have a valid date object for the event start date
    let startDate;
    if (event.start) {
      if (event.start instanceof Date) {
        startDate = event.start;
      } else {
        startDate = new Date(event.start);
        if (isNaN(startDate.getTime())) {
          // Fallback to current date if parsing fails
          console.error('Invalid date detected, using today as fallback');
          startDate = new Date();
        }
      }
    } else {
      startDate = new Date();
    }

    // Set event targeting type based on event data
    if (event.isForAllCoOwners !== undefined) {
      setIsForAllCoOwners(event.isForAllCoOwners);

      // Determine the event target type based on the event data
      if (event.isForAllCoOwners) {
        setEventTargetType('all');
      } else if (event.selectedBlocs && event.selectedBlocs.length > 0) {
        setEventTargetType('blocs');
        setSelectedBlocs(Array.isArray(event.selectedBlocs)
          ? event.selectedBlocs.map(bloc => typeof bloc === 'object' ? bloc._id : bloc)
          : [event.selectedBlocs]
        );

        // Fetch apartments for these blocs
        if (event.selectedBlocs.length > 0) {
          try {
            const response = await api.get(
              `/api/Building/blocsAppartments/${event.selectedBlocs.map(bloc =>
                typeof bloc === 'object' ? bloc._id : bloc
              ).join(',')}/apartments`
            );
            setAvailableApartments(response.data || []);
          } catch (error) {
            console.error('Error fetching apartments for blocs:', error);
          }
        }
      } else if (event.selectedApartments && event.selectedApartments.length > 0) {
        setEventTargetType('apartments');
        setSelectedApartments(Array.isArray(event.selectedApartments)
          ? event.selectedApartments.map(apt => typeof apt === 'object' ? apt._id : apt)
          : [event.selectedApartments]
        );
      } else {
        setEventTargetType('all');
      }
    } else {
      setIsForAllCoOwners(true);
      setEventTargetType('all');
      setSelectedBlocs([]);
      setSelectedApartments([]);
    }

    // Ensure all required fields are properly set
    validation.setValues({
      title: event.title || "",
      category: event.className || event.category || "bg-soft-primary",
      start: startDate,
      eventTime: event.eventTime || "",
      endTime: event.endTime || "",
      location: event.location || "",
      description: event.description || "",
    });

    setEditModal(true);
  };
  const handleEventDrop = async (info) => {
    if (user.role !== "SyndicateAdmin") return;
    if (info.event.extendedProps.type === 'task') return;
    const { event } = info;
    const updatedEvent = {
      _id: event.extendedProps._id,
      title: event.title,
      start: event.start,
      eventTime: event.extendedProps?.eventTime || "",
      className: event.classNames[0],
      location: event.extendedProps.location,
      description: event.extendedProps.description,
    };
    try {
      await dispatch(updateEvent({ id: event.extendedProps._id, eventData: updatedEvent })).unwrap();
      toast.success(t('calendar.eventMoved'));
    } catch (err) {
      toast.error(t('calendar.eventMoveFailed'));
    }
  };

  const startMeeting = async (eventId) => {
    setStartingMeeting(true);
    try {
      // Check if user has subscription access to video conferencing
      if (user.role === 'SyndicateAdmin') {
        // Admin is restricted by their own subscription
        if (!hasVideoConferenceAccess(user)) {
          if (!toastShownRef.current?.noVideoAccess) {
            toast.error(t('calendar.noVideoConferenceAccess'));
            toastShownRef.current = { ...toastShownRef.current, noVideoAccess: true };
          }
          setStartingMeeting(false);
          return;
        }

        // Check remaining time
        const remainingTime = getRemainingVideoConferenceTime(user);
        if (remainingTime !== Infinity && remainingTime <= 0) {
          if (!toastShownRef.current?.timeExceeded) {
            toast.error(t('calendar.videoTimeExceeded'));
            toastShownRef.current = { ...toastShownRef.current, timeExceeded: true };
          }
          setStartingMeeting(false);
          return;
        }
      }

      // If user is co-owner, they can always start/join regardless of subscription
      // Time limits will be enforced in the groqmeet component based on admin's subscription

      // Start the meeting
      await dispatch(startMeetingAction(eventId)).unwrap();
      window.location.href = `/meeting/${eventId}`;
      toast.success(t('calendar.meetingStarted'));
      toggleDetailsModal();
    } catch (error) {
      console.error('Failed to start meeting:', error);
      toast.error(error.message || t('calendar.meetingStartFailed'));
    } finally {
      setStartingMeeting(false);
    }
  };

  const joinMeeting = async (eventId) => {
    setJoiningMeeting(true);
    try {
      // Check if user has subscription access to video conferencing
      if (user.role === 'SyndicateAdmin') {
        // Admin is restricted by their own subscription
        if (!hasVideoConferenceAccess(user)) {
          if (!toastShownRef.current?.noVideoAccess) {
            toast.error(t('calendar.noVideoConferenceAccess'));
            toastShownRef.current = { ...toastShownRef.current, noVideoAccess: true };
          }
          setJoiningMeeting(false);
          return;
        }

        // Check remaining time
        const remainingTime = getRemainingVideoConferenceTime(user);
        if (remainingTime !== Infinity && remainingTime <= 0) {
          if (!toastShownRef.current?.timeExceeded) {
            toast.error(t('calendar.videoTimeExceeded'));
            toastShownRef.current = { ...toastShownRef.current, timeExceeded: true };
          }
          setJoiningMeeting(false);
          return;
        }
      }

      // Co-owners can always join - time enforcement happens in groqmeet component

      await dispatch(joinMeetingAction(eventId)).unwrap();
      window.location.href = `/meeting/${eventId}`;
      toast.success(t('calendar.meetingJoining'));
      toggleDetailsModal();
    } catch (error) {
      console.error('Failed to join meeting:', error);
      if (error.message && error.message.includes("not currently active")) {
        toast.info(t('calendar.meetingNotActive'));
      } else {
        toast.error(error.message || t('calendar.meetingJoinFailed'));
      }
    } finally {
      setJoiningMeeting(false);
    }
  };

  const endMeeting = async (eventId) => {
    setEndingMeeting(true);
    try {
      await dispatch(endMeetingAction(eventId)).unwrap();
      toast.success(t('calendar.meetingEnded'));
    } catch (error) {
      console.error('Failed to end meeting:', error);
      toast.error(error.message || t('calendar.meetingEndFailed'));
    } finally {
      setEndingMeeting(false);
    }
  };
  // Add a state for time conflict errors
  const [timeConflictError, setTimeConflictError] = useState(null);

  // Add this effect to check for conflicts as time values change
  useEffect(() => {
    // Only check if we have all required values
    if (validation.values.start && validation.values.eventTime && validation.values.endTime) {
      const conflict = detectTimeConflict(
        validation.values.start,
        validation.values.eventTime,
        validation.values.endTime,
        calendarItems,
        isEdit ? event._id : null
      );

      if (conflict.hasConflict) {
        setTimeConflictError({
          message: t('calendar.timeConflict'),
          conflictingEvent: conflict.conflictingEvent
        });
      } else {
        setTimeConflictError(null);
      }
    }
  }, [validation.values.start, validation.values.eventTime, validation.values.endTime, calendarItems, isEdit]);
  return (
    <React.Fragment>
      <DeleteModal
        show={deleteModal}
        onDeleteClick={handleDeleteEvent}
        onCloseClick={() => setDeleteModal(false)}
      />
      <div className="page-content">
        <BreadCrumb title={t('calendar.title')} pageTitle={t('calendar.pageTitle')} />

        <Container fluid >
          {/* Welcome Card */}
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
                        <h4 className="fw-semibold mb-2">{t('calendar.title')}</h4>
                        <p className="text-muted mb-3">{t('calendar.welcomeCard')}</p>
                        <div className="d-flex flex-wrap gap-2">
                          {currentBuilding ? (
                            <Badge color="info" pill className="fs-12 py-2 px-3">
                              <i className="ri-building-line me-1"></i> {t('calendar.managing')}: {currentBuilding.name}
                            </Badge>
                          ) : (
                            <Badge color="primary" pill className="fs-12 py-2 px-3">
                              <i className="ri-building-line me-1"></i> {t('calendar.allProperties')}
                            </Badge>
                          )}
                          <Badge color="primary" pill className="fs-12 py-2 px-3">
                            <i className="ri-calendar-event-line me-1"></i> {t('calendar.totalEvents')}: {totalEvents}
                          </Badge>
                          <Badge color="success" pill className="fs-12 py-2 px-3">
                            <i className="ri-video-chat-line me-1"></i> {t('calendar.activeMeetings')}: {activeMeetings}
                          </Badge>
                          <Badge color="warning" pill className="fs-12 py-2 px-3">
                            <i className="ri-task-line me-1"></i> {t('calendar.totalTasks')}: {totalTasks}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <div className="d-flex justify-content-end">
                          {user.role === "SyndicateAdmin" && (
                            <Button disabled={!currentBuilding?._id}
                              title={!currentBuilding?._id ? t('calendar.selectBuilding') : t('calendar.createEvent')} color="success" tag={Link} onClick={toggle}>
                              <FaCalendarAlt className="me-1" /> {t('calendar.createEvent')}
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
            <Col xs={12}>
              <Row>
                {user.role === "SyndicateAdmin" && (
                  <Col xl={3}>
                    <Card className="calendar-sidebar-card">
                      <CardBody>
                        <button
                          className="btn btn-primary w-100 calendar-create-event-btn"
                          id="btn-new-event"
                          onClick={toggle}
                          disabled={!currentBuilding?._id}
                          title={!currentBuilding?._id ? t('calendar.selectBuilding') : t('calendar.createEvent')}
                        >
                          <i className="mdi mdi-plus"></i> {t('calendar.createEvent')}
                        </button>

                        <div className="calendar-events-list-wrapper">
                          <h5 className="calendar-events-list-title">{t('calendar.upcomingEvents')}</h5>
                          <div className="calendar-events-list">
                            {calendarItems && calendarItems.slice(0, 5).map((item) => (
                              <div
                                className={`calendar-event-item ${item.className.replace('bg-soft-', 'text-')} cursor-pointer`}
                                key={"event-" + item._id}
                                onClick={() => handleUpcomingEventClick(item._id)}
                                style={{ cursor: 'pointer' }}
                              >
                                <i className="ri-calendar-event-line me-2"></i>
                                <span className="calendar-event-title text-truncate">
                                  {item.title}
                                </span>
                                <small className="calendar-event-date">
                                  {new Date(item.start).toLocaleDateString()}
                                </small>
                              </div>
                            ))}

                            {calendarItems.length === 0 && (
                              <div className="calendar-no-events-message">
                                <i className="ri-information-line me-1"></i> {t('calendar.noEvents')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="calendar-legend-container">
                          <h5 className="calendar-legend-title">{t('calendar.eventTypes')}</h5>
                          <div className="calendar-event-legend">
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot bg-danger"></span>
                              <span className="legend-label">{t('calendar.eventTypeUrgent')}</span>
                            </div>
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot bg-success"></span>
                              <span className="legend-label">{t('calendar.eventTypeMeeting')}</span>
                            </div>
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot bg-primary"></span>
                              <span className="legend-label">{t('calendar.eventTypeGeneral')}</span>
                            </div>
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot bg-info"></span>
                              <span className="legend-label">{t('calendar.eventTypeInformational')}</span>
                            </div>
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot bg-dark"></span>
                              <span className="legend-label">{t('calendar.eventTypeImportant')}</span>
                            </div>
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot bg-warning"></span>
                              <span className="legend-label">{t('calendar.eventTypeWarning')}</span>
                            </div>
                            <div className="calendar-legend-item">
                              <span className="calendar-color-dot" style={{ backgroundColor: "#03A9F4" }}></span>
                              <span className="legend-label">{t('calendar.eventTypeTask')}</span>
                            </div>
                            <div className="calendar-legend-item delegate-legend">
                              <span className="calendar-color-dot delegate-dot" style={{ backgroundColor: "#6f42c1" }}></span>
                              <span className="legend-label">{t('calendar.eventTypeDelegate')}</span>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                )}
                <Col xl={user.role === "SyndicateAdmin" ? 9 : 12}>
                  <Card className="calendar-card">
                    <CardBody>
                      {!currentBuilding && (
                        <div className="calendar-building-notice">
                          <i className="ri-building-2-line"></i> {t('calendar.selectBuilding')}
                        </div>
                      )}
                      <FullCalendar
                        key={calendarKey}
                        plugins={[BootstrapTheme, dayGridPlugin, interactionPlugin, listPlugin]}
                        locale={getCalendarLocale()}
                        eventDrop={handleEventDrop}
                        initialView="dayGridMonth"
                        slotDuration={"00:15:00"}
                        handleWindowResize={true}
                        themeSystem="bootstrap"
                        headerToolbar={{
                          left: "prev,next today",
                          center: "title",
                          right: "dayGridMonth,dayGridWeek,dayGridDay,listWeek",
                        }}
                        events={calendarItems}
                        editable={user.role === "SyndicateAdmin"}
                        droppable={user.role === "SyndicateAdmin"}
                        selectable={user.role === "SyndicateAdmin"}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        eventContent={(arg) => {
                          const isTask = arg.event.extendedProps.type === 'task';
                          const isDelegate = arg.event.extendedProps.isDelegate;

                          return (
                            <div className="fc-event-main">
                              <div className="fc-event-title-container">
                                <div className="fc-event-title text-truncate">
                                  {arg.event.title}
                                </div>
                                {isDelegate && (
                                  <div className="calendar-event-delegate-badge">
                                    <i className="ri-user-shared-line me-1"></i>
                                    <span className="text-xs">
                                      {t('calendar.delegateFor') || 'Delegate for'} {arg.event.extendedProps.delegatorName}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {isTask && (
                                <div className="calendar-event-status">
                                  <span className={`badge ${arg.event.extendedProps.status === 'Completed' ? 'calendar-badge-completed' : 'calendar-badge-pending'}`}>
                                    {arg.event.extendedProps.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* Add Modal with Improved Design */}
              <Modal isOpen={modal} id="event-modal" centered size="xl">
                <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-light">
                  <i className="ri-calendar-event-line me-2"></i> {t('calendar.modalAddTitle')}
                </ModalHeader>
                <ModalBody className="modal-body p-4">
                  <Form
                    className="needs-validation"
                    name="event-form"
                    id="form-event"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      validation.handleSubmit();
                      return false;
                    }}
                  >
                    <Row>
                      {/* Left Column - Basic Event Details */}
                      <Col md={7} className="border-end pe-4">
                        <h5 className="mb-3">{t('calendar.eventDetails')}</h5>

                        <Row className="mb-3">
                          <Col md={8}>
                            <Label className="form-label">{t('calendar.modalAddEventTitle')} <span className="text-danger">*</span></Label>
                            <Input
                              className="form-control"
                              placeholder={t('calendar.modalAddTitlePlaceholder')}
                              type="text"
                              name="title"
                              id="event-title"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.title || ""}
                              invalid={validation.touched.title && !!validation.errors.title}
                              required
                            />
                            {validation.touched.title && validation.errors.title ? (
                              <FormFeedback type="invalid">{validation.errors.title}</FormFeedback>
                            ) : null}
                          </Col>
                          <Col md={4}>
                            <Label className="form-label">{t('calendar.modalAddEventType')}</Label><span className="text-danger">*</span>
                            <Input
                              className="form-select"
                              name="category"
                              id="event-category"
                              type="select"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              required
                              value={validation.values.category || ""}
                              invalid={validation.touched.category && !!validation.errors.category}
                            >
                              <option value="bg-soft-danger">{t('calendar.eventTypeUrgent')}</option>
                              <option value="bg-soft-success">{t('calendar.eventTypeMeeting')}</option>
                              <option value="bg-soft-primary">{t('calendar.eventTypeGeneral')}</option>
                              <option value="bg-soft-info">{t('calendar.eventTypeInformational')}</option>
                              <option value="bg-soft-dark">{t('calendar.eventTypeImportant')}</option>
                              <option value="bg-soft-warning">{t('calendar.eventTypeWarning')}</option>
                            </Input>
                            {validation.touched.category && validation.errors.category ? (
                              <FormFeedback type="invalid">{validation.errors.category}</FormFeedback>
                            ) : null}
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={4}>
                            <Label>{t('calendar.modalAddStartDate')} <span className="text-danger">*</span></Label>
                            <div className="input-group">
                              <Flatpickr
                                className={`form-control ${validation.touched.start && validation.errors.start ? 'is-invalid' : ''}`}
                                id="event-start-date"
                                name="start"
                                placeholder={t('calendar.modalAddStartDatePlaceholder')}
                                value={validation.values.start}
                                options={{ dateFormat: "Y-m-d" }}
                                required
                                onChange={(date) => validation.setFieldValue('start', date[0])}
                              />
                              <span className="input-group-text">
                                <i className="ri-calendar-event-line"></i>
                              </span>
                            </div>
                            {validation.touched.start && validation.errors.start ? (
                              <div className="invalid-feedback d-block">{validation.errors.start}</div>
                            ) : null}
                          </Col>
                          <Col md={4}>
                            <Label>{t('calendar.modalAddEventTime')}</Label><span className="text-danger">*</span>
                            <div className="input-group">
                              <Flatpickr
                                className={`form-control ${validation.touched.eventTime && validation.errors.eventTime ? 'is-invalid' : ''}`}
                                id="event-time"
                                name="eventTime"
                                placeholder="Select time"
                                value={validation.values.eventTime}
                                options={{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: "H:i",
                                  time_24hr: true,
                                  minuteIncrement: 15
                                }}
                                onChange={(time) => {
                                  const timeString = time[0] ? time[0].toTimeString().slice(0, 5) : '';
                                  validation.setFieldValue('eventTime', timeString);
                                }}
                              />
                              <span className="input-group-text">
                                <i className="ri-time-line"></i>
                              </span>
                            </div>
                            {validation.touched.eventTime && validation.errors.eventTime ? (
                              <div className="invalid-feedback d-block">{validation.errors.eventTime}</div>
                            ) : null}
                          </Col>
                          <Col md={4}>
                            <Label>{t('calendar.modalAddEndTime')} <span className="text-danger">*</span></Label>
                            <div className="input-group">
                              <Flatpickr
                                className={`form-control ${validation.touched.endTime && validation.errors.endTime ? 'is-invalid' : ''}`}
                                id="event-end-time"
                                name="endTime"
                                placeholder="Select end time"
                                value={validation.values.endTime}
                                options={{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: "H:i",
                                  time_24hr: true,
                                  minuteIncrement: 15
                                }}
                                onChange={(time) => {
                                  const timeString = time[0] ? time[0].toTimeString().slice(0, 5) : '';
                                  validation.setFieldValue('endTime', timeString);
                                }}
                              />
                              <span className="input-group-text">
                                <i className="ri-time-line"></i>
                              </span>
                            </div>
                            {validation.touched.endTime && validation.errors.endTime ? (
                              <div className="invalid-feedback d-block">{validation.errors.endTime}</div>
                            ) : null}
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={12}>
                            <Label htmlFor="event-location">{t('calendar.modalAddLocation')}</Label>
                            <Input
                              type="text"
                              className="form-control"
                              name="location"
                              id="event-location"
                              placeholder={t('calendar.modalAddLocationPlaceholder')}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.location || ""}
                              invalid={validation.touched.location && !!validation.errors.location}
                            />
                            {validation.touched.location && validation.errors.location ? (
                              <FormFeedback type="invalid">{validation.errors.location}</FormFeedback>
                            ) : null}
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={12}>
                            <Label className="form-label">{t('calendar.modalAddDescription')}</Label>
                            <textarea
                              className={`form-control ${validation.touched.description && validation.errors.description ? 'is-invalid' : ''}`}
                              id="event-description"
                              name="description"
                              placeholder={t('calendar.modalAddDescriptionPlaceholder')}
                              rows="3"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.description || ""}
                            ></textarea>
                            {validation.touched.description && validation.errors.description ? (
                              <FormFeedback type="invalid">{validation.errors.description}</FormFeedback>
                            ) : null}
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col>
                            <Label className="form-label">{t('calendar.attachPolls')}</Label>
                            <div className="poll-selection-container">
                              {availablePolls.length > 0 ? (
                                <div className="poll-list">
                                  {availablePolls.map(poll => (
                                    <div
                                      key={poll._id}
                                      className={`poll-selection-item ${selectedPolls.includes(poll._id) ? 'selected' : ''}`}
                                      onClick={() => togglePollSelection(poll._id)}
                                    >
                                      <div className="d-flex align-items-center">
                                        <div className="form-check">
                                          <Input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selectedPolls.includes(poll._id)}
                                            onChange={() => { }} // Handled by the onClick on the container
                                            id={`poll-${poll._id}`}
                                          />
                                          <Label className="form-check-label" htmlFor={`poll-${poll._id}`}>
                                            {poll.title}
                                          </Label>
                                        </div>
                                        <Badge color="primary" className="ms-2">
                                          {poll.questions?.length || 0} {t('calendar.questions')}
                                        </Badge>
                                      </div>
                                      <small className="text-muted d-block mt-1">
                                        {poll.description?.length > 50 ?
                                          `${poll.description.substring(0, 50)}...` :
                                          poll.description || t('calendar.noDescription')}
                                      </small>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <Alert color="info">
                                  {t('calendar.noAvailablePolls')}
                                </Alert>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Col>

                      {/* Right Column - Targeting & Attachments */}
                      <Col md={5} className="ps-4">
                        <Row>
                          <Col md={12} className="mb-4">
                            <h5 className="mb-3">{t('calendar.eventTargeting')}</h5>
                            <div className="event-targeting-options p-3 rounded bg-light mb-3">
                              <div className="mb-3">
                                <div className="form-check mb-2">
                                  <Input
                                    type="radio"
                                    className="form-check-input"
                                    id="targetAll"
                                    name="eventTargetType"
                                    checked={eventTargetType === 'all'}
                                    onChange={() => handleEventTargetTypeChange('all')}
                                  />
                                  <Label className="form-check-label fw-medium" htmlFor="targetAll">
                                    <i className="ri-group-line me-1 text-primary"></i> {t('calendar.targetAll')}
                                  </Label>
                                  <small className="form-text d-block text-muted ms-4">
                                    {t('calendar.targetAllDescription')}
                                  </small>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="form-check mb-2">
                                  <Input
                                    type="radio"
                                    className="form-check-input"
                                    id="targetBlocs"
                                    name="eventTargetType"
                                    checked={eventTargetType === 'blocs'}
                                    onChange={() => handleEventTargetTypeChange('blocs')}
                                  />
                                  <Label className="form-check-label fw-medium" htmlFor="targetBlocs">
                                    <i className="ri-building-line me-1 text-info"></i> {t('calendar.targetBlocs')}
                                  </Label>
                                  <small className="form-text d-block text-muted ms-4">
                                    {t('calendar.targetBlocsDescription')}
                                  </small>
                                </div>

                                {eventTargetType === 'blocs' && (
                                  <div className="ms-4 mt-3">
                                    <Label className="form-label">{t('calendar.selectBlocs')}</Label>
                                    <Select
                                      isMulti
                                      name="selectedBlocs"
                                      options={availableBlocs.map(bloc => ({ value: bloc._id, label: bloc.name }))}
                                      className="basic-multi-select"
                                      classNamePrefix="select"
                                      onChange={(selected) => handleBlocSelection(selected.map(option => option.value))}
                                      placeholder={t('calendar.selectBlocsPlaceholder')}
                                    />
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="form-check mb-2">
                                  <Input
                                    type="radio"
                                    className="form-check-input"
                                    id="targetApartments"
                                    name="eventTargetType"
                                    checked={eventTargetType === 'apartments'}
                                    onChange={() => handleEventTargetTypeChange('apartments')}
                                  />
                                  <Label className="form-check-label fw-medium" htmlFor="targetApartments">
                                    <i className="ri-home-line me-1 text-success"></i> {t('calendar.targetApartments')}
                                  </Label>
                                  <small className="form-text d-block text-muted ms-4">
                                    {t('calendar.targetApartmentsDescription')}
                                  </small>
                                </div>

                                {eventTargetType === 'apartments' && (
                                  <div className="ms-4 mt-3">
                                    <Label className="form-label">{t('calendar.selectApartments')}</Label>
                                    <Select
                                      isMulti
                                      name="selectedApartments"
                                      options={availableApartments.map(apt => {
                                        const coOwnerName = apt.coOwner ?
                                          (typeof apt.coOwner === 'string' ? apt.coOwner :
                                            `${apt.coOwner.firstName || ''} ${apt.coOwner.lastName || ''}`.trim())
                                          : '';
                                        return {
                                          value: apt._id,
                                          label: `#${apt.number} (${t('calendar.floor')} ${apt.floor})${coOwnerName ? ` - ${coOwnerName}` : ''}`
                                        };
                                      })}
                                      className="basic-multi-select"
                                      classNamePrefix="select"
                                      onChange={(selected) => handleApartmentSelection(selected.map(option => option.value))}
                                      placeholder={t('calendar.selectApartmentsPlaceholder')}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </Col>

                          <Col md={12}>
                            <h5 className="mb-3">
                              <i className="ri-attachment-line me-1"></i>
                              {t('calendar.attachments')}
                            </h5>
                            <div className="attachment-section p-3 rounded bg-light">
                              <Input
                                type="file"
                                className="form-control mb-3"
                                id="event-documents"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                                onChange={handleFileSelection}
                              />
                              <small className="text-muted d-block mb-3">
                                <i className="ri-information-line me-1"></i>
                                {t('calendar.allowedFileTypes')}: PDF, Word, Excel, PowerPoint, Images (Max: 10MB each)
                              </small>

                              {selectedFiles.length > 0 && (
                                <div className="selected-files-list rounded border p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  <div className="d-flex justify-content-between mb-2 border-bottom pb-1">
                                    <small className="fw-medium text-muted">{t('calendar.selectedFiles')} ({selectedFiles.length})</small>
                                    <Button size="sm" color="link" className="p-0" onClick={() => setSelectedFiles([])} type="button">
                                      {t('calendar.clearAll')}
                                    </Button>
                                  </div>
                                  {selectedFiles.map((file, index) => (
                                    <div key={index} className="selected-file-item border-bottom pb-2 mb-2">
                                      <div className="d-flex justify-content-between align-items-center mb-1">
                                        <div className="d-flex align-items-center">
                                          <i className={`ri-file-${getFileIcon(file.name)} text-primary me-2`}></i>
                                          <div className="text-truncate" style={{ maxWidth: '180px' }}>
                                            <span className="fw-medium small">{file.name}</span>
                                            <span className="text-muted small d-block">
                                              {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          color="danger"
                                          size="sm"
                                          className="btn-sm p-1"
                                          onClick={() => removeSelectedFile(index)}
                                        >
                                          <i className="ri-close-line"></i>
                                        </Button>
                                      </div>
                                      <Input
                                        type="text"
                                        size="sm"
                                        placeholder={t('calendar.documentDescriptionPlaceholder')}
                                        value={documentDescriptions[index] || ''}
                                        onChange={(e) => handleDocumentDescriptionChange(index, e.target.value)}
                                        className="form-control form-control-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Col>
                      {/* Add this inside your modal body, in both add and edit event modals */}

                    </Row>

                    <div className="hstack gap-2 justify-content-end pt-4 mt-3 border-top">
                      <Button color="light" onClick={toggle} className="btn-sm px-3">
                        <i className="ri-close-line me-1"></i>
                        {t('calendar.modalAddCancel')}
                      </Button>
                      <Button
                        type="submit"
                        color="primary"
                        id="btn-save-event"
                        className="btn-sm px-4"
                        disabled={isSubmitting || timeConflictError}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            {t('calendar.saving')}
                          </>
                        ) : timeConflictError ? (
                          <>
                            <i className="ri-time-line me-1"></i>
                            {t('calendar.timeConflict')}
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line me-1"></i>
                            {t('calendar.modalAddSubmit')}
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </ModalBody>
              </Modal>

              {/* Edit Modal with Improved Design */}
              <Modal isOpen={editModal} toggle={toggleEditModal} centered size="xl">
                <ModalHeader toggle={toggleEditModal} tag="h5" className="p-3 bg-light">
                  <i className="ri-edit-box-line me-2"></i> {t('calendar.modalEditTitle')}
                </ModalHeader>

                <ModalBody className="p-4">
                  <Form
                    className="needs-validation"
                    name="edit-event-form"
                    id="edit-form-event"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      validation.handleSubmit();
                      return false;
                    }}
                  >
                    <Row>
                      {/* Left Column - Basic Event Details */}
                      <Col md={7} className="border-end pe-4">
                        <h5 className="mb-3">{t('calendar.eventDetails')}</h5>

                        <Row className="mb-3">
                          <Col md={8}>
                            <Label className="form-label">{t('calendar.modalAddEventTitle')} <span className="text-danger">*</span></Label>
                            <Input
                              className="form-control"
                              placeholder={t('calendar.modalAddTitlePlaceholder')}
                              type="text"
                              name="title"
                              id="event-title"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.title || ""}
                              invalid={validation.touched.title && !!validation.errors.title}
                              required
                            />
                            {validation.touched.title && validation.errors.title ? (
                              <FormFeedback type="invalid">{validation.errors.title}</FormFeedback>
                            ) : null}
                          </Col>
                          <Col md={4}>
                            <Label className="form-label">{t('calendar.modalAddEventType')}</Label>
                            <Input
                              className="form-select"
                              name="category"
                              id="event-category"
                              type="select"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.category || ""}
                              invalid={validation.touched.category && !!validation.errors.category}
                            >
                              <option value="bg-soft-danger">{t('calendar.eventTypeUrgent')}</option>
                              <option value="bg-soft-success">{t('calendar.eventTypeMeeting')}</option>
                              <option value="bg-soft-primary">{t('calendar.eventTypeGeneral')}</option>
                              <option value="bg-soft-info">{t('calendar.eventTypeInformational')}</option>
                              <option value="bg-soft-dark">{t('calendar.eventTypeImportant')}</option>
                              <option value="bg-soft-warning">{t('calendar.eventTypeWarning')}</option>
                            </Input>
                            {validation.touched.category && validation.errors.category ? (
                              <FormFeedback type="invalid">{validation.errors.category}</FormFeedback>
                            ) : null}
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={4}>
                            <Label>{t('calendar.modalAddStartDate')} <span className="text-danger">*</span></Label>
                            <div className="input-group">
                              <Flatpickr
                                className={`form-control ${validation.touched.start && validation.errors.start ? 'is-invalid' : ''}`}
                                id="event-start-date"
                                name="start"
                                placeholder={t('calendar.modalAddStartDatePlaceholder')}
                                value={validation.values.start}
                                options={{ dateFormat: "Y-m-d" }}
                                onChange={(date) => validation.setFieldValue('start', date[0])}
                              />
                              <span className="input-group-text">
                                <i className="ri-calendar-event-line"></i>
                              </span>
                            </div>
                            {validation.touched.start && validation.errors.start ? (
                              <div className="invalid-feedback d-block">{validation.errors.start}</div>
                            ) : null}
                          </Col>
                          <Col md={4}>
                            <Label>{t('calendar.modalAddEventTime')}</Label>
                            <div className="input-group">
                              <Flatpickr
                                className={`form-control ${validation.touched.eventTime && validation.errors.eventTime ? 'is-invalid' : ''}`}
                                id="event-time"
                                name="eventTime"
                                placeholder="Select time"
                                value={validation.values.eventTime}
                                options={{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: "H:i",
                                  time_24hr: true,
                                  minuteIncrement: 15
                                }}
                                onChange={(time) => {
                                  const timeString = time[0] ? time[0].toTimeString().slice(0, 5) : '';
                                  validation.setFieldValue('eventTime', timeString);
                                }}
                              />
                              <span className="input-group-text">
                                <i className="ri-time-line"></i>
                              </span>
                            </div>
                            {validation.touched.eventTime && validation.errors.eventTime ? (
                              <div className="invalid-feedback d-block">{validation.errors.eventTime}</div>
                            ) : null}
                          </Col>
                          <Col md={4}>
                            <Label>{t('calendar.modalAddEndTime')} <span className="text-danger">*</span></Label>
                            <div className="input-group">
                              <Flatpickr
                                className={`form-control ${validation.touched.endTime && validation.errors.endTime ? 'is-invalid' : ''}`}
                                id="event-end-time"
                                name="endTime"
                                placeholder="Select end time"
                                value={validation.values.endTime}
                                options={{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: "H:i",
                                  time_24hr: true,
                                  minuteIncrement: 15
                                }}
                                onChange={(time) => {
                                  const timeString = time[0] ? time[0].toTimeString().slice(0, 5) : '';
                                  validation.setFieldValue('endTime', timeString);
                                }}
                              />
                              <span className="input-group-text">
                                <i className="ri-time-line"></i>
                              </span>
                            </div>
                            {validation.touched.endTime && validation.errors.endTime ? (
                              <div className="invalid-feedback d-block">{validation.errors.endTime}</div>
                            ) : null}
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={12}>
                            <Label htmlFor="event-location">{t('calendar.modalAddLocation')}</Label>
                            <Input
                              type="text"
                              className="form-control"
                              name="location"
                              id="event-location"
                              placeholder={t('calendar.modalAddLocationPlaceholder')}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.location || ""}
                              invalid={validation.touched.location && !!validation.errors.location}
                            />
                            {validation.touched.location && validation.errors.location ? (
                              <FormFeedback type="invalid">{validation.errors.location}</FormFeedback>
                            ) : null}
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={12}>
                            <Label className="form-label">{t('calendar.modalAddDescription')}</Label>
                            <textarea
                              className={`form-control ${validation.touched.description && validation.errors.description ? 'is-invalid' : ''}`}
                              id="event-description"
                              name="description"
                              placeholder={t('calendar.modalAddDescriptionPlaceholder')}
                              rows="3"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              value={validation.values.description || ""}
                            ></textarea>
                            {validation.touched.description && validation.errors.description ? (
                              <FormFeedback type="invalid">{validation.errors.description}</FormFeedback>
                            ) : null}
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col>
                            <Label className="form-label">{t('calendar.attachPolls')}</Label>
                            <div className="poll-selection-container">
                              {availablePolls.length > 0 ? (
                                <div className="poll-list">
                                  {availablePolls.map(poll => (
                                    <div
                                      key={poll._id}
                                      className={`poll-selection-item ${selectedPolls.includes(poll._id) ? 'selected' : ''}`}
                                      onClick={() => togglePollSelection(poll._id)}
                                    >
                                      <div className="d-flex align-items-center">
                                        <div className="form-check">
                                          <Input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selectedPolls.includes(poll._id)}
                                            onChange={() => { }} // Handled by the onClick on the container
                                            id={`poll-${poll._id}`}
                                          />
                                          <Label className="form-check-label" htmlFor={`poll-${poll._id}`}>
                                            {poll.title}
                                          </Label>
                                        </div>
                                        <Badge color="primary" className="ms-2">
                                          {poll.questions?.length || 0} {t('calendar.questions')}
                                        </Badge>
                                      </div>
                                      <small className="text-muted d-block mt-1">
                                        {poll.description?.length > 50 ?
                                          `${poll.description.substring(0, 50)}...` :
                                          poll.description || t('calendar.noDescription')}
                                      </small>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <Alert color="info">
                                  {t('calendar.noAvailablePolls')}
                                </Alert>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Col>

                      {/* Right Column - Targeting & Attachments */}
                      <Col md={5} className="ps-4">
                        <Row>
                          {/* Existing documents section */}
                          {isEdit && event.documents && event.documents.length > 0 && (
                            <Col md={12} className="mb-4">
                              <h5 className="mb-3">{t('calendar.existingDocuments')}</h5>
                              <div className="existing-documents border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {event.documents.map((doc, idx) => (
                                  <div key={doc._id} className={`document-item d-flex align-items-center p-2 mb-2 rounded ${documentsToRemove.includes(doc._id) ? 'bg-danger-subtle border-danger' : 'bg-light border'}`}>
                                    <div className="document-icon me-2" style={{ color: documentsToRemove.includes(doc._id) ? '#dc3545' : '#0d6efd' }}>
                                      <i className={`ri-file-${getFileIcon(doc.fileName)}-line fs-5`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className={`document-name ${documentsToRemove.includes(doc._id) ? 'text-danger text-decoration-line-through' : ''}`}>
                                        {doc.fileName}
                                      </div>
                                      {doc.description && (
                                        <small className="text-muted d-block">{doc.description}</small>
                                      )}
                                    </div>
                                    <div>
                                      {documentsToRemove.includes(doc._id) ? (
                                        <Button
                                          color="success"
                                          size="sm"
                                          className="btn-icon"
                                          onClick={() => setDocumentsToRemove(prev => prev.filter(id => id !== doc._id))}
                                          title={t('calendar.restore')}
                                        >
                                          <i className="ri-arrow-go-back-line"></i>
                                        </Button>
                                      ) : (
                                        <Button
                                          color="danger"
                                          size="sm"
                                          className="btn-icon"
                                          onClick={() => markDocumentForRemoval(doc._id)}
                                          title={t('calendar.remove')}
                                        >
                                          <i className="ri-delete-bin-line"></i>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {documentsToRemove.length > 0 && (
                                <div className="mt-2">
                                  <small className="text-danger">
                                    <i className="ri-information-line me-1"></i>
                                    {documentsToRemove.length} {documentsToRemove.length === 1 ? 'document' : 'documents'} will be removed when you save changes
                                  </small>
                                </div>
                              )}
                            </Col>
                          )}

                          <Col md={12} className="mb-4">
                            <h5 className="mb-3">
                              <i className="ri-attachment-line me-1"></i>
                              {isEdit ? t('calendar.addMoreDocuments') : t('calendar.attachDocuments')}
                            </h5>
                            <div className="attachment-section p-3 rounded bg-light">
                              <Input
                                type="file"
                                className="form-control mb-3"
                                id="event-documents"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                                onChange={handleFileSelection}
                              />
                              <small className="text-muted d-block mb-3">
                                <i className="ri-information-line me-1"></i>
                                {t('calendar.allowedFileTypes')}: PDF, Word, Excel, PowerPoint, Images (Max: 10MB each)
                              </small>

                              {selectedFiles.length > 0 && (
                                <div className="selected-files-list rounded border p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  <div className="d-flex justify-content-between mb-2 border-bottom pb-1">
                                    <small className="fw-medium text-muted">{t('calendar.selectedFiles')} ({selectedFiles.length})</small>
                                    <Button size="sm" color="link" className="p-0" onClick={() => setSelectedFiles([])} type="button">
                                      {t('calendar.clearAll')}
                                    </Button>
                                  </div>
                                  {selectedFiles.map((file, index) => (
                                    <div key={index} className="selected-file-item border-bottom pb-2 mb-2">
                                      <div className="d-flex justify-content-between align-items-center mb-1">
                                        <div className="d-flex align-items-center">
                                          <i className={`ri-file-${getFileIcon(file.name)} text-primary me-2`}></i>
                                          <div className="text-truncate" style={{ maxWidth: '180px' }}>
                                            <span className="fw-medium small">{file.name}</span>
                                            <span className="text-muted small d-block">
                                              {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          color="danger"
                                          size="sm"
                                          className="btn-sm p-1"
                                          onClick={() => removeSelectedFile(index)}
                                        >
                                          <i className="ri-close-line"></i>
                                        </Button>
                                      </div>
                                      <Input
                                        type="text"
                                        size="sm"
                                        placeholder={t('calendar.documentDescriptionPlaceholder')}
                                        value={documentDescriptions[index] || ''}
                                        onChange={(e) => handleDocumentDescriptionChange(index, e.target.value)}
                                        className="form-control form-control-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Col>

                          <Col md={12}>
                            <h5 className="mb-3">{t('calendar.eventTargeting')}</h5>
                            <div className="event-targeting-options p-3 rounded bg-light mb-3">
                              <div className="mb-3">
                                <div className="form-check mb-2">
                                  <Input
                                    type="radio"
                                    className="form-check-input"
                                    id="editTargetAll"
                                    name="eventTargetType"
                                    checked={eventTargetType === 'all'}
                                    onChange={() => handleEventTargetTypeChange('all')}
                                  />
                                  <Label className="form-check-label fw-medium" htmlFor="editTargetAll">
                                    <i className="ri-group-line me-1 text-primary"></i> {t('calendar.targetAll')}
                                  </Label>
                                  <small className="form-text d-block text-muted ms-4">
                                    {t('calendar.targetAllDescription')}
                                  </small>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="form-check mb-2">
                                  <Input
                                    type="radio"
                                    className="form-check-input"
                                    id="editTargetBlocs"
                                    name="eventTargetType"
                                    checked={eventTargetType === 'blocs'}
                                    onChange={() => handleEventTargetTypeChange('blocs')}
                                  />
                                  <Label className="form-check-label fw-medium" htmlFor="editTargetBlocs">
                                    <i className="ri-building-line me-1 text-info"></i> {t('calendar.targetBlocs')}
                                  </Label>
                                  <small className="form-text d-block text-muted ms-4">
                                    {t('calendar.targetBlocsDescription')}
                                  </small>
                                </div>

                                {eventTargetType === 'blocs' && (
                                  <div className="ms-4 mt-3">
                                    <Label className="form-label">{t('calendar.selectBlocs')}</Label>
                                    <Select
                                      isMulti
                                      name="selectedBlocs"
                                      options={availableBlocs.map(bloc => ({ value: bloc._id, label: bloc.name }))}
                                      className="basic-multi-select"
                                      classNamePrefix="select"
                                      onChange={(selected) => handleBlocSelection(selected.map(option => option.value))}
                                      placeholder={t('calendar.selectBlocsPlaceholder')}
                                      defaultValue={selectedBlocs.map(blocId => {
                                        const bloc = availableBlocs.find(b => b._id === blocId);
                                        return bloc ? { value: bloc._id, label: bloc.name } : null;
                                      }).filter(Boolean)}
                                    />
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="form-check mb-2">
                                  <Input
                                    type="radio"
                                    className="form-check-input"
                                    id="editTargetApartments"
                                    name="eventTargetType"
                                    checked={eventTargetType === 'apartments'}
                                    onChange={() => handleEventTargetTypeChange('apartments')}
                                  />
                                  <Label className="form-check-label fw-medium" htmlFor="editTargetApartments">
                                    <i className="ri-home-line me-1 text-success"></i> {t('calendar.targetApartments')}
                                  </Label>
                                  <small className="form-text d-block text-muted ms-4">
                                    {t('calendar.targetApartmentsDescription')}
                                  </small>
                                </div>

                                {eventTargetType === 'apartments' && (
                                  <div className="ms-4 mt-3">
                                    <Label className="form-label">{t('calendar.selectApartments')}</Label>
                                    <Select
                                      isMulti
                                      name="selectedApartments"
                                      options={availableApartments.map(apt => {
                                        const coOwnerName = apt.coOwner ?
                                          (typeof apt.coOwner === 'string' ? apt.coOwner :
                                            `${apt.coOwner.firstName || ''} ${apt.coOwner.lastName || ''}`.trim())
                                          : '';
                                        return {
                                          value: apt._id,
                                          label: `#${apt.number} (${t('calendar.floor')} ${apt.floor})${coOwnerName ? ` - ${coOwnerName}` : ''}`
                                        };
                                      })}
                                      className="basic-multi-select"
                                      classNamePrefix="select"
                                      onChange={(selected) => handleApartmentSelection(selected.map(option => option.value))}
                                      placeholder={t('calendar.selectApartmentsPlaceholder')}
                                      defaultValue={selectedApartments.map(aptId => {
                                        const apt = availableApartments.find(a => a._id === aptId);
                                        if (!apt) return null;

                                        const coOwnerName = apt.coOwner ?
                                          (typeof apt.coOwner === 'string' ? apt.coOwner :
                                            `${apt.coOwner.firstName || ''} ${apt.coOwner.lastName || ''}`.trim())
                                          : '';

                                        return {
                                          value: apt._id,
                                          label: `#${apt.number} (${t('calendar.floor')} ${apt.floor})${coOwnerName ? ` - ${coOwnerName}` : ''}`
                                        };
                                      }).filter(Boolean)}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Col>
                    </Row>

                    <div className="hstack gap-2 justify-content-end pt-4 mt-3 border-top">
                      <Button color="light" onClick={toggleEditModal}>
                        <i className="ri-close-line me-1"></i>
                        {t('calendar.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        color="primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            {t('calendar.saving')}
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line me-1"></i>
                            {t('calendar.saveChanges')}
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </ModalBody>
              </Modal>

              {/* Details Modal with Enhanced Design */}
              <Modal
                isOpen={detailsModal}
                toggle={toggleDetailsModal}
                centered
                className="event-details-modal"
                size="xl"
              >
                <ModalHeader toggle={toggleDetailsModal} tag="h5" className="p-3 bg-light">
                  {event?.type === 'task' ? (
                    <div className="d-flex align-items-center">
                      <i className="ri-task-line me-2 text-info"></i> {t('calendar.modalDetailsTaskTitle')}
                    </div>
                  ) : (
                    <div className="d-flex align-items-center">
                      <i className="ri-calendar-event-line me-2 text-primary"></i> {t('calendar.modalDetailsEventTitle')}
                    </div>
                  )}
                </ModalHeader>

                <ModalBody className="p-4">
                  {event && event.title ? (
                    <Row>
                      {/* Event Title and Badge Row */}
                      <Col xs={12} className="mb-4">
                        <div className="d-flex justify-content-between align-items-start flex-wrap">
                          <div>
                            <h4 className="mb-1">{event.title}</h4>
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                              {event?.type === 'task' && (
                                <Badge color={event.status === 'Completed' ? 'success' : 'warning'} className="me-2">
                                  {event.status}
                                </Badge>
                              )}
                              {event?.extendedProps?.isDelegate && (
                                <Badge color="purple" className="delegate-badge">
                                  <i className="ri-user-shared-line me-1"></i>
                                  {t('calendar.attendingAsDelegate') || 'Attending as delegate for'} {event.extendedProps.delegatorName}
                                </Badge>
                              )}
                              <div className="text-muted small">
                                <i className="ri-calendar-event-line me-1"></i>
                                {event.start ? formatDate(event.start) : ''}
                                {event.eventTime ? ` • ${event.eventTime}` : ''}
                              </div>
                            </div>
                          </div>
                          {!event?.type && user.role === 'SyndicateAdmin' && (
                            <div className="d-flex gap-2">
                              <Button color="light" size="sm" onClick={handleEditButtonClick}>
                                <i className="ri-edit-2-line me-1"></i> {t('calendar.edit')}
                              </Button>
                              <Button color="danger" size="sm" onClick={() => setDeleteModal(true)}>
                                <i className="ri-delete-bin-line me-1"></i> {t('calendar.delete')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </Col>

                      {/* Main Content */}
                      <Col lg={8}>
                        {/* Information Cards */}
                        <div className="event-detail-cards mb-4">
                          <Row>
                            <Col sm={6} lg={4} className="mb-3">
                              <div className="detail-card p-3 rounded border bg-light h-100">
                                <div className="d-flex align-items-center mb-2">
                                  <div className="detail-icon rounded-circle bg-primary-subtle text-primary me-2">
                                    <i className="ri-calendar-event-line"></i>
                                  </div>
                                  <h6 className="mb-0">{t('calendar.modalDetailsDate')}</h6>
                                </div>
                                <div className="detail-value">{event.start ? formatDate(event.start) : t('calendar.notSpecified')}</div>
                              </div>
                            </Col>
                            <Col sm={6} lg={4} className="mb-3">
                              <div className="detail-card p-3 rounded border bg-light h-100">
                                <div className="d-flex align-items-center mb-2">
                                  <div className="detail-icon rounded-circle bg-info-subtle text-info me-2">
                                    <i className="ri-time-line"></i>
                                  </div>
                                  <h6 className="mb-0">{event?.type === 'task' ? t('calendar.modalDetailsCreatedTime') : t('calendar.modalDetailsEventTime')}</h6>
                                </div>
                                <div className="detail-value">{event.eventTime || t('calendar.notSpecified')}</div>
                              </div>
                            </Col>
                            <Col sm={6} lg={4} className="mb-3">
                              <div className="detail-card p-3 rounded border bg-light h-100">
                                <div className="d-flex align-items-center mb-2">
                                  <div className="detail-icon rounded-circle bg-success-subtle text-success me-2">
                                    <i className="ri-map-pin-line"></i>
                                  </div>
                                  <h6 className="mb-0">{t('calendar.modalDetailsLocation')}</h6>
                                </div>
                                <div className="detail-value">{event.location || t('calendar.notSpecified')}</div>
                              </div>
                            </Col>
                            {(event.user || event.createdBy) && (
                              <Col sm={6} lg={4} className="mb-3">
                                <div className="detail-card p-3 rounded border bg-light h-100">
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="detail-icon rounded-circle bg-warning-subtle text-warning me-2">
                                      <i className="ri-user-line"></i>
                                    </div>
                                    <h6 className="mb-0">{t('calendar.modalDetailsCreatedBy')}</h6>
                                  </div>
                                  <div className="detail-value">
                                    {(() => {
                                      if (event.createdBy) {
                                        if (typeof event.createdBy === 'string') {
                                          return event.createdBy;
                                        } else if (event.createdBy.firstName && event.createdBy.lastName) {
                                          return `${event.createdBy.firstName} ${event.createdBy.lastName}`;
                                        }
                                      }

                                      if (event.user) {
                                        if (typeof event.user === 'string') {
                                          return event.user;
                                        } else if (event.user.firstName && event.user.lastName) {
                                          return `${event.user.firstName} ${event.user.lastName}`;
                                        }
                                      }

                                      return t('calendar.notSpecified');
                                    })()}
                                  </div>
                                </div>
                              </Col>
                            )}
                            {event?.type === 'task' && event.assignedTo && (
                              <Col sm={6} lg={4} className="mb-3">
                                <div className="detail-card p-3 rounded border bg-light h-100">
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="detail-icon rounded-circle bg-danger-subtle text-danger me-2">
                                      <i className="ri-user-follow-line"></i>
                                    </div>
                                    <h6 className="mb-0">{t('calendar.modalDetailsAssignedTo')}</h6>
                                  </div>
                                  <div className="detail-value">{event.assignedTo.firstName} {event.assignedTo.lastName}</div>
                                </div>
                              </Col>
                            )}
                            <Col sm={6} lg={4} className="mb-3">
                              <div className="detail-card p-3 rounded border bg-light h-100">
                                <div className="d-flex align-items-center mb-2">
                                  <div className="detail-icon rounded-circle bg-dark-subtle text-dark me-2">
                                    <i className="ri-bookmark-line"></i>
                                  </div>
                                  <h6 className="mb-0">{t('calendar.modalDetailsType')}</h6>
                                </div>
                                <div className="detail-value">
                                  {event?.type === 'task' ? (
                                    <span className="badge bg-info">{t('calendar.task')}</span>
                                  ) : (
                                    <span className="badge bg-primary">{t('calendar.event')}</span>
                                  )}
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </div>

                        {/* Description Section */}
                        <div className="mb-4">
                          <h5 className="mb-3">
                            <i className="ri-file-text-line me-2 text-primary"></i>
                            {t('calendar.modalDetailsDescription')}
                          </h5>
                          <div className="p-3 rounded border bg-light">
                            {event.description ? (
                              <p className="mb-0">{event.description}</p>
                            ) : (
                              <p className="text-muted mb-0 fst-italic">{t('calendar.noDescription')}</p>
                            )}
                          </div>
                        </div>

                        {/* Meeting Section */}
                        {event.meeting && !event.type && (
                          <div className="meeting-section mb-4">
                            <h5 className="mb-3">
                              <i className="ri-vidicon-line me-2 text-primary"></i>
                              {t('calendar.modalDetailsOnlineMeeting')}
                            </h5>
                            <div className="p-3 rounded border" style={{ background: '#f8f9fa' }}>
                              {/* Meeting status indicator */}
                              <div className="d-flex align-items-center mb-3">
                                <div className={`status-indicator ${event.meeting.isActive ? 'bg-success' : 'bg-secondary'} rounded-circle me-2`}
                                  style={{ width: '12px', height: '12px' }}></div>
                                <span className={`${event.meeting.isActive ? 'text-success' : 'text-muted'} fw-medium`}>
                                  {event.meeting.isActive ? t('calendar.meetingActive') : t('calendar.meetingInactive')}
                                </span>
                              </div>

                              {!event.meeting.isActive && (
                                <div className="alert alert-info mb-3 py-2" style={{ fontSize: '0.9rem' }}>
                                  <i className="ri-information-line me-1"></i>
                                  {t('calendar.meetingInactiveExplanation')}
                                </div>
                              )}


                              <div className="meeting-actions">
                                {user.role === 'SyndicateAdmin' ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {/* CHANGE THIS BUTTON LOGIC */}
                                    <Button
                                      color={event.meeting.isActive ? "primary" : "success"}
                                      onClick={() => event.meeting.isActive ? joinMeeting(event._id) : startMeeting(event._id)}
                                      disabled={startingMeeting || joiningMeeting}
                                    >
                                      <i className={`ri-${event.meeting.isActive ? 'login-circle-line' : 'play-circle-line'} me-1`}></i>
                                      {startingMeeting ? t('calendar.starting') :
                                        joiningMeeting ? t('calendar.joining') :
                                          (event.meeting.isActive ? t('calendar.joinMeeting') : t('calendar.startMeeting'))}
                                    </Button>
                                    {event.meeting.isActive && (
                                      <Button
                                        color="danger"
                                        onClick={() => endMeeting(event._id)}
                                        disabled={endingMeeting}
                                      >
                                        <i className="ri-stop-circle-line me-1"></i>
                                        {endingMeeting ? t('calendar.ending') : t('calendar.endMeeting')}
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <Button
                                      color="primary"
                                      onClick={() => joinMeeting(event._id)}
                                      disabled={joiningMeeting || !event.meeting.isActive}
                                    >
                                      <i className="ri-login-circle-line me-1"></i>
                                      {joiningMeeting ? t('calendar.joining') : t('calendar.joinMeeting')}
                                    </Button>
                                    {!event.meeting.isActive && (
                                      <div className="mt-2">
                                        <small className="text-muted">
                                          <i className="ri-time-line me-1"></i>
                                          {t('calendar.waitingForAdmin')}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Event Targeting Section */}
                        {!event.type && (
                          <div className="targeting-section mb-4">
                            <h5 className="mb-3">
                              <i className="ri-group-line me-2 text-primary"></i>
                              {t('calendar.modalDetailsTargeting')}
                            </h5>
                            <div className="p-3 rounded border" style={{ background: '#f8f9fa' }}>
                              {event.isForAllCoOwners === true ? (
                                <div className="targeting-all">
                                  <div className="d-flex align-items-center mb-2">
                                    <Badge color="primary" className="me-2">
                                      <i className="ri-group-line me-1"></i>
                                      {t('calendar.targetAll')}
                                    </Badge>
                                    <span className="text-muted">{t('calendar.modalDetailsAllCoOwnersDesc')}</span>
                                  </div>
                                </div>
                              ) : event.selectedBlocs && event.selectedBlocs.length > 0 ? (
                                <div className="targeting-blocs">
                                  <div className="d-flex align-items-center mb-2">
                                    <Badge color="info" className="me-2">
                                      <i className="ri-building-line me-1"></i>
                                      {t('calendar.modalDetailsTargetedBlocs')}
                                    </Badge>
                                  </div>
                                  <div className="selected-items mt-2">
                                    <small className="text-muted d-block mb-2">{t('calendar.modalDetailsSelectedBlocs')}:</small>
                                    <div className="d-flex flex-wrap gap-2">
                                      {event.selectedBlocs.map((bloc, index) => {
                                        const blocName = typeof bloc === 'object' ? bloc.name : bloc;
                                        const blocId = typeof bloc === 'object' ? bloc._id : bloc;
                                        return (
                                          <Badge key={blocId || index} color="light" className="text-dark border">
                                            {blocName || `Bloc ${index + 1}`}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : event.selectedApartments && event.selectedApartments.length > 0 ? (
                                <div className="targeting-apartments">
                                  <div className="d-flex align-items-center mb-2">
                                    <Badge color="warning" className="me-2">
                                      <i className="ri-home-line me-1"></i>
                                      {t('calendar.modalDetailsTargetedApartments')}
                                    </Badge>
                                  </div>
                                  <div className="selected-items mt-2">
                                    <small className="text-muted d-block mb-2">
                                      {t('calendar.modalDetailsSelectedApartments')} ({event.selectedApartments.length}):
                                    </small>
                                    <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                      {event.selectedApartments.map((apartment, index) => {
                                        let displayText;
                                        if (typeof apartment === 'object') {
                                          const blocName = apartment.bloc?.name || 'N/A';
                                          displayText = `#${apartment.number} (${blocName})`;
                                        } else {
                                          displayText = apartment;
                                        }

                                        const apartmentId = typeof apartment === 'object' ? apartment._id : apartment;
                                        return (
                                          <Badge key={apartmentId || index} color="light" className="text-dark border">
                                            {displayText}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="targeting-default">
                                  <div className="d-flex align-items-center">
                                    <Badge color="secondary" className="me-2">
                                      <i className="ri-question-line me-1"></i>
                                      {t('calendar.modalDetailsTargetingNotSpecified')}
                                    </Badge>
                                    <span className="text-muted">{t('calendar.modalDetailsDefaultTargeting')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Col>

                      {/* Right Sidebar */}
                      <Col lg={4}>
                        {/* Documents Section */}
                        {event.documents && event.documents.length > 0 && (
                          <div className="documents-section mb-4">
                            <h5 className="mb-3">
                              <i className="ri-attachment-line me-2 text-primary"></i>
                              {t('calendar.attachedDocuments')} ({event.documents.length})
                            </h5>
                            <div className="documents-list border rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              {event.documents.map((document, index) => (
                                <div key={document._id || index}
                                  className={`document-item p-3 ${index < event.documents.length - 1 ? 'border-bottom' : ''}`}>
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="document-icon me-3 rounded p-2"
                                      style={{ backgroundColor: 'rgba(13, 110, 253, 0.1)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <i className={`ri-file-${getFileIcon(document.fileName)} text-primary fs-4`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className="fw-medium text-break">{document.fileName}</div>
                                      <div className="text-muted small">
                                        {(document.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(document.uploadDate).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                  {document.description && (
                                    <div className="description ms-5 ps-1 mb-2 text-muted fst-italic">
                                      "{document.description}"
                                    </div>
                                  )}
                                  <div className="action-buttons ms-5 ps-1">
                                    <Button
                                      color="outline-primary"
                                      size="sm"
                                      className="me-2"
                                      onClick={() => downloadDocument(event._id, document._id, document.fileName)}
                                    >
                                      <i className="ri-download-line me-1"></i>
                                      {t('calendar.download')}
                                    </Button>
                                    {user.role === 'SyndicateAdmin' && (
                                      <Button
                                        color="outline-danger"
                                        size="sm"
                                        onClick={() => {
                                          if (window.confirm(t('calendar.confirmDeleteDocument'))) {
                                            deleteDocument(event._id, document._id);
                                          }
                                        }}
                                      >
                                        <i className="ri-delete-bin-line me-1"></i>
                                        {t('calendar.delete')}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Poll Manager Section */}
                        {!event.type && (
                          // Add this inside your EventDetailsModal component in Calendar.js
                          <Card className="mt-3">
                            <CardHeader>
                              <h5>{t('calendar.associatedPolls')}</h5>
                            </CardHeader>
                            <CardBody>
                              <div className="poll-section mt-4">
                                <h5 className="mb-3">{t('calendar.associatedPolls')}</h5>
                                {eventPolls && eventPolls.length > 0 ? (
                                  <div className="event-polls-list">
                                    {eventPolls.map(poll => (
                                      <Card key={poll._id} className="mb-2">
                                        <CardBody className="p-3">
                                          <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                              <h6 className="mb-1">{poll.title}</h6>
                                              <small className="text-muted">
                                                {poll.questions?.length || 0} {t('calendar.questions')} •
                                                <Badge
                                                  color={
                                                    poll.status === 'active' ? 'success' :
                                                      poll.status === 'completed' ? 'info' :
                                                        'secondary'
                                                  }
                                                  className="ms-1"
                                                >
                                                  {t(`calendar.pollStatus.${poll.status}`)}
                                                </Badge>
                                              </small>
                                            </div>
                                            <div>

                                              {user.role === 'SyndicateAdmin' && poll.status !== 'active' && poll.status !== 'completed' && (
                                                <Button
                                                  color="danger"
                                                  size="sm"
                                                  outline
                                                  onClick={() => confirmDetachPoll(poll)}
                                                >
                                                  <i className="ri-link-unlink-m me-1"></i> {t('calendar.detach')}
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </CardBody>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <Alert color="info">
                                    <i className="ri-information-line me-2"></i>
                                    {t('calendar.noAssociatedPolls')}
                                  </Alert>
                                )}
                              </div>
                            </CardBody>
                          </Card>
                        )}
                      </Col>
                    </Row>
                  ) : (
                    <div className="text-center p-5">
                      <div className="mb-3">
                        <i className="ri-information-line display-4 text-muted"></i>
                      </div>
                      <h5>{t('calendar.noDetails')}</h5>
                    </div>
                  )}
                </ModalBody>

                <ModalFooter>
                  <Button color="secondary" onClick={toggleDetailsModal}>
                    <i className="ri-close-line me-1"></i>
                    {t('calendar.close')}
                  </Button>
                </ModalFooter>
              </Modal>
            </Col>
          </Row>
        </Container>
      </div>
      {/* Detach Poll Confirmation Modal */}
      <Modal isOpen={detachConfirmModal} toggle={() => setDetachConfirmModal(!detachConfirmModal)}>
        <ModalHeader toggle={() => setDetachConfirmModal(!detachConfirmModal)}>
          {t('calendar.confirmDetachPoll')}
        </ModalHeader>
        <ModalBody>
          <p>{t('calendar.confirmDetachPollMessage')}</p>
          <p><strong>{pollToDetach?.title}</strong></p>
          <p className="text-muted small">{t('calendar.detachPollNote')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDetachConfirmModal(false)}>
            {t('calendar.cancel')}
          </Button>
          <Button
            color="danger"
            onClick={() => handleDetachPoll(pollToDetach?._id)}
            disabled={detachPollLoading}
          >
            {detachPollLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('calendar.detaching')}
              </>
            ) : (
              t('calendar.detachPoll')
            )}
          </Button>
        </ModalFooter>
      </Modal>
      <ConflictAlertModal
        isOpen={conflictModal}
        toggle={() => setConflictModal(false)}
        conflictDetails={conflictDetails}
        t= {t}
      />
    </React.Fragment >
  );
};

export default withTranslation()(Calendar);