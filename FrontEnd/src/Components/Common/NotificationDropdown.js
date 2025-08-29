import React, { useState, useEffect } from 'react';
import { Col, Dropdown, DropdownMenu, DropdownToggle, Nav, NavItem, NavLink, Row, TabContent, TabPane, Badge, Button } from 'reactstrap';
import { Link, redirect, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import SimpleBar from "simplebar-react";
import bell from "../../assets/images/svg/bell.svg";
import {
    fetchNotifications,
    markNotificationsAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} from '../../slices/Notification/slice';
import { setActiveChat } from '../../slices/chat/reducer';
import userDummyImage from "../../assets/images/users/user-dummy-img.jpg";
import "./toastNotification.css";
import DropImage from './displayDropdown';
const NotificationDropdown = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { notifications, unreadCount, loading } = useSelector(state => state.notifications);
    // Get message notifications
    const messageNotifications = notifications.filter(n => n.type === 'message');
    const alertNotifications = notifications.filter(n => n.type === 'alert' || n.type === 'system');

    // Message unread count
    const messageUnreadCount = messageNotifications.filter(n => !n.isRead).length;
    const alertUnreadCount = alertNotifications.filter(n => !n.isRead).length;
    console.log("messageNotifications", messageNotifications);
    //Dropdown Toggle
    const [isNotificationDropdown, setIsNotificationDropdown] = useState(false);
    const toggleNotificationDropdown = () => {
        setIsNotificationDropdown(!isNotificationDropdown);
        if (!isNotificationDropdown) {
            dispatch(fetchNotifications());
        }
    };

    //Tab 
    const [activeTab, setActiveTab] = useState('1');
    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    // Fetch notifications when component mounts
    useEffect(() => {
        dispatch(fetchNotifications());
        // // Set up interval to fetch notifications every minute
        // const interval = setInterval(() => {
        //     dispatch(fetchNotifications());
        // }, 60000);

        // return () => clearInterval(interval);
    }, [dispatch]);


    // Update the handleNotificationClick function:

    // Update your handleNotificationClick function
    const handleNotificationClick = (notification) => {
        console.log("Notification clicked:", notification);

        if (!notification.isRead) {
            dispatch(markNotificationsAsRead([notification._id]));
        }

        // First check if this is a gamification notification
        if (notification.onModel === 'gamification' || notification.gamification) {
            console.log("Gamification notification clicked, navigating to profile");
            setIsNotificationDropdown(false);
            navigate('/profile');
            return;
        }

        // Navigate based on notification type
        if (notification.type === 'message' && notification.relatedTo) {
            dispatch(setActiveChat(notification.relatedTo));

            // Switch to chat tab if needed
            if (window.location.pathname !== '/apps-chat') {
                navigate('/apps-chat');
            } else {
                // If already on chat page, scroll to latest messages
                setTimeout(() => {
                    const messagesContainer = document.querySelector('.chat-conversation-box');
                    if (messagesContainer) {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }, 300);
            }

            setIsNotificationDropdown(false);
        } else if (notification.type === 'alert' && notification.onModel === 'Event' && notification.relatedTo) {
            navigate('/calendar');
            setIsNotificationDropdown(false);
        } else if (notification.type === 'alert' && notification.onModel === 'Subscription' && notification.relatedTo) {
    navigate('/subscription');
    setIsNotificationDropdown(false);
    }else if (notification.type === 'alert' && notification.onModel === 'Contract' && notification.relatedTo) {
    navigate('/profile');
    setIsNotificationDropdown(false);
  }
    else if (notification.type === 'alert' && notification.onModel === 'Task' && notification.relatedTo) {
    navigate('/task');
    setIsNotificationDropdown(false);
  }else if (notification.type === 'alert' && notification.onModel === 'Review' && notification.relatedTo) {
    navigate('/review');
    setIsNotificationDropdown(false);
  }else if (notification.type === 'alert' && notification.relatedTo) {
            console.log("Alert notification detected with relatedTo:", notification.relatedTo);
            setIsNotificationDropdown(false);

            setTimeout(() => {
                // Check if this is a chat-related notification
                if (notification.onModel === 'Invoice') {

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
                } else if (notification.onModel === 'Chat') {
                    dispatch(setActiveChat(notification.relatedTo));
                    navigate('/apps-chat');
                }
                // Building/Apartment notifications
                else if (notification.onModel === 'Building') {
                    navigate(`/Apartements`);
                }
                // Building/Apartment notifications
                else if (notification.onModel === 'coowner') {
                    navigate(`/pages-team`);
                }
                // Otherwise handle task notifications
                else if (
                    notification.conversionNotification ||
                    notification.taskId ||
                    notification.title?.toLowerCase().includes('task') ||
                    notification.content?.toLowerCase().includes('task') ||
                    notification.onModel === 'Task'
                ) {
                    console.log("Navigating to task page");
                    navigate(`/task`);
                }
                // Handle claim notifications
                else {
                    console.log("Navigating to claim page");
                    navigate(`/Claim?id=${notification.relatedTo}`);
                }
            }, 50);
        }
    };
    // Add this function within your NotificationDropdown component
    const getGamificationIcon = (reason) => {
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
    // Mark all as read
    const handleMarkAllAsRead = () => {
        dispatch(markAllNotificationsAsRead());
    };

    // Format time
    const formatNotificationTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHr / 24);

        if (diffSec < 60) return t('notifications.timeJustNow');
        if (diffMin < 60) return `${diffMin} ${diffMin !== 1 ? t('notifications.timeMinutes') : t('notifications.timeMinute')} ${t('notifications.timeAgo')}`;
        if (diffHr < 24) return `${diffHr} ${diffHr !== 1 ? t('notifications.timeHours') : t('notifications.timeHour')} ${t('notifications.timeAgo')}`;
        if (diffDays < 7) return `${diffDays} ${diffDays !== 1 ? t('notifications.timeDays') : t('notifications.timeDay')} ${t('notifications.timeAgo')}`;

        return date.toLocaleDateString();
    };

    return (
        <React.Fragment>
            <Dropdown isOpen={isNotificationDropdown} toggle={toggleNotificationDropdown} className="topbar-head-dropdown ms-1 header-item">
                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle">
                    <i className='bx bx-bell fs-22'></i>
                    {unreadCount > 0 && (
                        <span className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                            {unreadCount > 99 ? '99+' : unreadCount}
                            <span className="visually-hidden">{t('notifications.unreadNotifications')}</span>
                        </span>
                    )}
                </DropdownToggle>
<DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0" style={{
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
}}>                    

<div className="dropdown-head bg-primary bg-pattern rounded-top" style={{ 
    background: ' linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)', 
    borderTopLeftRadius: '16px', 
    borderTopRightRadius: '16px' 
}}>
    <div className="p-3">
        <Row className="align-items-center">
            <Col>
                <h6 className="m-0 fs-16 fw-semibold" style={{ color: "#e6485c " }}>{t('notifications.title')}</h6>
            </Col>
            <div className="col-auto dropdown-tabs">
                {unreadCount > 0 && (
                    <span className="badge fs-13" style={{ backgroundColor: "#e6485c ", color: "#fff" }}> {unreadCount} {t('notifications.new')}</span>
                )}
            </div>
        </Row>
    </div>

    <div className="px-2 pt-2">
        <Nav className="nav-tabs dropdown-tabs nav-tabs-custom">
            <NavItem>
                <NavLink
                    href="#"
                    className={classnames({ active: activeTab === '1' })}
                    onClick={() => { toggleTab('1'); }}
                    style={{ color: "#e6485c" }}
                >
                    {t('notifications.all')} ({notifications.length})
                    {unreadCount > 0 && <Badge color="navbar" pill className="ms-1">{unreadCount}</Badge>}
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    href="#"
                    className={classnames({ active: activeTab === '2' })}
                    onClick={() => { toggleTab('2'); }}
                    style={{ color: "#e6485c" }}
                >
                    {t('notifications.messages')}
                    {messageUnreadCount > 0 && <Badge color="navbar" pill className="ms-1">{messageUnreadCount}</Badge>}
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    href="#"
                    className={classnames({ active: activeTab === '3' })}
                    onClick={() => { toggleTab('3'); }}
                    style={{ color: "#e6485c " }}
                >
                    {t('notifications.alerts')}
                    {alertUnreadCount > 0 && <Badge color="navbar" pill className="ms-1">{alertUnreadCount}</Badge>}
                </NavLink>
            </NavItem>
        </Nav>
    </div>
</div>

                    <TabContent activeTab={activeTab}>
                        <TabPane tabId="1" className="py-2 ps-2">
                            <SimpleBar style={{ maxHeight: "300px" }} className="pe-2">
                                {loading ? (
                                    <div className="text-center p-3">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">{t('notifications.loading')}</span>
                                        </div>
                                    </div>
                                ) : notifications.length > 0 ? (
                                    notifications.map((notification) => (
                                        <div
                                            key={notification._id}
                                            className={`text-reset notification-item d-block ${!notification.isRead ? 'unread-notification' : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{ position: 'relative' }}
                                        >
                                            <div className="d-flex">
                                                {notification.type === 'message' ? (
                                                    <DropImage
                                                        className="me-3 rounded-circle avatar-xs"
                                                        avatar={notification.senderAvatar || 'defaultUserId'}
                                                        alt={notification.userName || 'user-pic'} />



                                                ) : (
                                                    <div className="avatar-xs me-3">
                                                        <span className={`avatar-title bg-soft-${notification.type === 'alert' ? 'danger' : 'info'} text-${notification.type === 'alert' ? 'danger' : 'info'} rounded-circle fs-16`}>
                                                            <i className={notification.type === 'alert' ? 'bx bx-error-circle' : 'bx bx-badge-check'}></i>
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h6 className="mt-0 mb-1 fs-13 fw-semibold">
                                                        {notification.title}
                                                    </h6>
                                                    <div className="fs-13 text-muted">
                                                        <p className="mb-1">{notification.content}</p>
                                                    </div>
                                                    <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                                        <span><i className="mdi mdi-clock-outline"></i> {formatNotificationTime(notification.createdAt)}</span>
                                                    </p>
                                                </div>
                                                {/* Delete button for each notification */}
                                                <Button
                                                    close
                                                    aria-label="Delete"
                                                    title="Delete notification"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        dispatch(deleteNotification(notification._id));
                                                    }}
                                                    style={{ marginLeft: 8, fontSize: 14 }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center">
                                        <img src={bell} className="img-fluid" style={{ maxWidth: "80px" }} alt="No notifications" />
                                        <p className="mt-3 text-muted">{t('notifications.noNotifications')}</p>
                                    </div>
                                )}

                                {notifications.length > 0 && (
                                    <div className="my-3 text-center d-flex justify-content-center gap-2">
                                        <Button
                                            type="button"
                                            color="soft-success"
                                            className="waves-effect"
                                            onClick={handleMarkAllAsRead}
                                        >
                                            {t('notifications.markAllAsRead')} <i className="ri-check-double-line align-middle"></i>
                                        </Button>
                                        {/* Delete all notifications button */}
                                        <Button
                                            type="button"
                                            color="soft-danger"
                                            className="waves-effect"
                                            onClick={() => {
                                                if (window.confirm(t('notifications.confirmDeleteAll'))) {
                                                    notifications.forEach(n => dispatch(deleteNotification(n._id)));
                                                }
                                            }}
                                        >
                                            {t('notifications.deleteAll')} <i className="ri-delete-bin-line align-middle"></i>
                                        </Button>
                                    </div>
                                )}
                            </SimpleBar>
                        </TabPane>

                        <TabPane tabId="2" className="py-2 ps-2">
                            <SimpleBar style={{ maxHeight: "300px" }} className="pe-2">
                                {loading ? (
                                    <div className="text-center p-3">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">{t('notifications.loading')}</span>
                                        </div>
                                    </div>
                                ) : messageNotifications.length > 0 ? (
                                    messageNotifications.map((notification) => (
                                        <div
                                            key={notification._id}
                                            className={`text-reset notification-item d-block ${!notification.isRead ? 'unread-notification' : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{ position: 'relative' }}
                                        >
                                            <div className="d-flex">
                                                <DropImage
                                                    className="me-3 rounded-circle avatar-xs"
                                                    avatar={notification.senderAvatar}
                                                    alt={notification.userName || 'user-pic'} />
                                                <div className="flex-1">
                                                    <h6 className="mt-0 mb-1 fs-13 fw-semibold">
                                                        {notification.title}
                                                    </h6>
                                                    <div className="fs-13 text-muted">
                                                        <p className="mb-1">{notification.content}</p>
                                                    </div>
                                                    <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                                        <span><i className="mdi mdi-clock-outline"></i> {formatNotificationTime(notification.createdAt)}</span>
                                                    </p>
                                                </div>
                                                {/* Delete button for each notification */}
                                                <Button
                                                    close
                                                    aria-label="Delete"
                                                    title="Delete notification"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        dispatch(deleteNotification(notification._id));
                                                    }}
                                                    style={{ marginLeft: 8, fontSize: 14 }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center">
                                        <img src={bell} className="img-fluid" style={{ maxWidth: "80px" }} alt="No notifications" />
                                        <p className="mt-3 text-muted">{t('notifications.noMessageNotifications')}</p>
                                    </div>
                                )}
                                {messageNotifications.length > 0 && (
                                    <div className="my-3 text-center">
                                        <Button
                                            type="button"
                                            color="soft-danger"
                                            className="waves-effect"
                                            onClick={() => {
                                                if (window.confirm(t('notifications.confirmDeleteAllMessages'))) {
                                                    messageNotifications.forEach(n => dispatch(deleteNotification(n._id)));
                                                }
                                            }}
                                        >
                                            {t('notifications.deleteAll')} <i className="ri-delete-bin-line align-middle"></i>
                                        </Button>
                                    </div>
                                )}
                            </SimpleBar>
                        </TabPane>

                        <TabPane tabId="3" className="py-2 ps-2">
                            <SimpleBar style={{ maxHeight: "300px" }} className="pe-2">
                                {loading ? (
                                    <div className="text-center p-3">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">{t('notifications.loading')}</span>
                                        </div>
                                    </div>
                                ) : alertNotifications.length > 0 ? (
                                    // Inside your rendering logic where you map over notifications:

                                    // In the render section - add a class and special icon for gamification notifications
                                    alertNotifications.map((notification) => (
                                        <div
                                            key={notification._id}
                                            className={`text-reset notification-item d-block ${!notification.isRead ? 'unread-notification' : ''} ${notification.gamification ? 'gamification-notification-item' : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{ position: 'relative' }}
                                        >
                                            <div className="d-flex">
                                                <div className="avatar-xs me-3">
                                                    {notification.gamification ? (
                                                        // Special styling for gamification notifications
                                                        <span className="avatar-title bg-soft-primary text-primary rounded-circle fs-16"
                                                            style={{ background: 'linear-gradient(135deg, rgba(67,97,238,0.1), rgba(58,12,163,0.1))', color: '#4361ee' }}>
                                                            <i className={getGamificationIcon(notification.reason)}></i>
                                                        </span>
                                                    ) : (
                                                        // Regular alert icon
                                                        <span className={`avatar-title bg-soft-${notification.type === 'alert' ? 'danger' : 'info'} text-${notification.type === 'alert' ? 'danger' : 'info'} rounded-circle fs-16`}>
                                                            <i className={notification.type === 'alert' ? 'bx bx-error-circle' : 'bx bx-badge-check'}></i>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h6 className="mt-0 mb-1 fs-13 fw-semibold">
                                                        {notification.title}
                                                        {notification.gamification && notification.points && (
                                                            <span className="gamification-badge ms-1">+{notification.points}</span>
                                                        )}
                                                    </h6>
                                                    <div className="fs-13 text-muted">
                                                        <p className="mb-1">{notification.content}</p>
                                                    </div>
                                                    <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                                        <span><i className="mdi mdi-clock-outline"></i> {formatNotificationTime(notification.createdAt)}</span>
                                                    </p>
                                                </div>
                                                <Button
                                                    close
                                                    aria-label="Delete"
                                                    title="Delete notification"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        dispatch(deleteNotification(notification._id));
                                                    }}
                                                    style={{ marginLeft: 8, fontSize: 14 }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center">
                                        <img src={bell} className="img-fluid" style={{ maxWidth: "80px" }} alt="No notifications" />
                                        <p className="mt-3 text-muted">{t('notifications.noAlerts')}</p>
                                    </div>
                                )}
                                {alertNotifications.length > 0 && (
                                    <div className="my-3 text-center">
                                        <Button
                                            type="button"
                                            color="soft-danger"
                                            className="waves-effect"
                                            onClick={() => {
                                                if (window.confirm(t('notifications.confirmDeleteAllAlerts'))) {
                                                    alertNotifications.forEach(n => dispatch(deleteNotification(n._id)));
                                                }
                                            }}
                                        >
                                            {t('notifications.deleteAll')} <i className="ri-delete-bin-line align-middle"></i>
                                        </Button>
                                    </div>
                                )}
                            </SimpleBar>
                        </TabPane>
                    </TabContent>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default NotificationDropdown;