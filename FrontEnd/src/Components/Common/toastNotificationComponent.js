import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearRecentNotification } from '../../slices/Notification/slice';
import { setActiveChat } from '../../slices/chat/reducer';
import "./toastNotification.css";
import DropImage from './displayDropdown';

const ToastNotification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notification = useSelector(state => state.notifications?.recentNotification);
  const [visible, setVisible] = useState(false);
  const [animatePoints, setAnimatePoints] = useState(false);

  useEffect(() => {
    console.log('Toast notification component updated, notification:', notification);
  }, [notification]);

  useEffect(() => {
    let timer;
    if (notification) {
      console.log('Setting toast notification visible for:', notification.title);
      setVisible(true);

      // For gamification notifications, add a points animation
      if (notification.gamification && notification.points) {
        setTimeout(() => {
          setAnimatePoints(true);
        }, 300);
      }

      timer = setTimeout(() => {
        setAnimatePoints(false);
        setVisible(false);
        setTimeout(() => dispatch(clearRecentNotification()), 300);
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [notification, dispatch]);

  if (!notification) return null;

  const handleClick = () => {
    setVisible(false);

    if (notification.type === 'message' && notification.chatId) {
      dispatch(setActiveChat(notification.chatId));
      navigate('/apps-chat');
    }
    else if (notification.type === 'alert' && notification.relatedTo) {
      // Handle gamification notifications - navigate to profile
      if (notification.gamification) {
        navigate('/profile');
      }
      // Handle other notification types
     else if (notification.onModel === 'Invoice') {

                    // If we have an invoiceId, navigate to the invoice detail view
                    if (notification.relatedTo) {
                        navigate(`/apps-invoices-details/${notification.relatedTo}`);
                    } else {
                        // Check user role to determine which invoice list to navigate to
                        const userRole = JSON.parse(localStorage.getItem("user"))?.role;

                      
                            // If the current user is syndicateAdmin, they should go to the admin invoice list
                            if (userRole === 'SyndicateAdmin') {
                                navigate('/apps-invoices-list');
                            }
                            // If the user is a co-owner, they should go to the co-owner invoice list
                            else if (userRole === 'SyndicateCoowner') {
                                navigate('/apps-invoices-list-coOwners');
                            }
                    }
                  }
      else if (notification.type === 'alert' && notification.eventId) {
        // Navigate to calendar/events page
        navigate('/calendar');
      }
      
      else if (notification.gamification) {
        setIsNotificationDropdown(false);
        navigate('/profile'); // Navigate to the profile/gamification page
      }
      else if (notification.onModel === 'Chat') {
        dispatch(setActiveChat(notification.relatedTo));
        navigate('/apps-chat');
      }
      else if (notification.onModel === 'coowner') {
        dispatch(setActiveChat(notification.relatedTo));
        navigate('/pages-team');
      }
      
      else if (notification.onModel === 'Building') {
        navigate(`/Apartements`);
      }
      else if (notification.title?.toLowerCase().includes('task') ||
        notification.content?.toLowerCase().includes('task')) {
        navigate(`/task`);
      }
      else if (notification.type === 'alert' && notification.contractId) {
    navigate('/profile');
  }
      else if (notification.type === 'alert' && notification.subscriptionId) {
    navigate('/subscription');
  }
      else if (notification.type === 'alert' && notification.reviewId) {
    navigate('/review');
  }
      else {
        navigate(`/Claim?id=${notification.relatedTo}`);
      }
    }

    setTimeout(() => {
      dispatch(clearRecentNotification());
    }, 300);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(() => dispatch(clearRecentNotification()), 300);
  };

  // Determine if this is a gamification notification
  const isGamification = notification.gamification === true;

  // Get icon based on reason
  const getGamificationIcon = () => {
    const reason = notification.reason || '';
    switch (reason) {
      case 'meeting_attendance':
        return 'ri-government-line';
      case 'voting':
        return 'ri-checkbox-circle-line';
      case 'early_payment':
        return 'ri-coins-line';
      default:
        return 'ri-award-line';
    }
  };

  return (
    <div
      className={`toast-notification ${visible ? 'show' : ''} ${isGamification ? 'gamification-toast' : ''}`}
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9999
      }}
      data-reason={notification.reason || ''}
    >
      <div className="toast-content">
        {isGamification && (
          <div className="gamification-spark left"></div>
        )}
        <div className={`toast-avatar ${isGamification ? 'gamification-avatar' : ''}`}>
          {isGamification ? (
            <div className="gamification-icon">
              <i className={getGamificationIcon()}></i>
            </div>
          ) : notification.type === 'message' ? (
            <DropImage
              className="rounded-circle"
              avatar={notification.senderAvatar || 'defaultUserId'}
              alt={notification.userName || 'Avatar'} />
          ) : (
            <div className={`avatar-icon bg-soft-${notification.type === 'alert' ? 'danger' : 'info'} text-${notification.type === 'alert' ? 'danger' : 'info'} rounded-circle`}>
              <i className={notification.type === 'alert' ? 'bx bx-error-circle' : 'bx bx-badge-check'}></i>
            </div>
          )}
        </div>
        <div className="toast-message">
          <div className="toast-title">
            {notification.title}
            {isGamification && notification.points && (
              <span className={`gamification-points ${animatePoints ? 'animate' : ''}`}>
                +{notification.points}
              </span>
            )}
          </div>
          <div className="toast-text">{notification.content}</div>

          {isGamification && (
            <div className="gamification-progress">
              <div className="progress-text">Keep it up!</div>
              
            </div>
          )}
        </div>
        {isGamification && (
          <div className="gamification-spark right"></div>
        )}
        <button
          className="toast-close"
          onClick={handleClose}
        >
          <i className="ri-close-line"></i>
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;