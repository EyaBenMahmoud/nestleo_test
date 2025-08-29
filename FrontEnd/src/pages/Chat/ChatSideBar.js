import React, { useEffect, useState } from 'react';
import {
    Button,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Badge,
    Input
} from 'reactstrap';
import { useSelector, useDispatch } from 'react-redux';
import SimpleBar from 'simplebar-react';
import classnames from 'classnames';
import { withTranslation } from 'react-i18next';
import { fetchUserChats, fetchChatMessages, setActiveChat, fetchAvailableUsers, fetchAvailableContacts } from '../../slices/chat/reducer';
import DropImage from '../../Components/Common/displayDropdown';
import userDummyImage from '../../assets/images/users/user-dummy-img.jpg';

const ChatSidebar = ({
    customActiveTab,
    toggleCustom,
    toggleGroupModal,
    userChatOpen,
    searchUsers,
    handleStartChat,
    loading,
    currentBuildingId,
    currentBuilding,
    t
}) => {
    const dispatch = useDispatch();
    const { contacts, chats, activeChatId, onlineUsers = [] } = useSelector((state) => state.chat);
    const { availableUsers } = useSelector((state) => state.chat);
    const user = useSelector((state) => state.Loginn.user || {});

    // Function to render participant badge based on role
    const renderRoleBadge = (role) => {
        switch (role) {
            case 'SyndicateAdmin':
                return <span className="syndicate-admin-badge ms-2">{t('chat.roleLabels.syndicAdmin')}</span>;
            case 'SyndicateCoowner':
                return <span className="coowner-badge ms-2">{t('chat.roleLabels.coOwner')}</span>;
            case 'Worker':
                return <span className="worker-badge ms-2">{t('chat.roleLabels.worker')}</span>;
            case 'Admin':
                return <span className="admin-badge ms-2">{t('chat.roleLabels.admin')}</span>;
            default:
                return null;
        }
    };
    // Fetch contacts when tab changes to contacts or when building changes
    useEffect(() => {
        if (customActiveTab === '2') {
            dispatch(fetchAvailableContacts(currentBuildingId));
        }
    }, [customActiveTab, currentBuildingId, dispatch]);
    // Format timestamp
    const formatTimestamp = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get unread count
    const getUnreadCount = (chat) => {
        if (!chat.unreadCounts) return 0;
        const unreadEntry = chat.unreadCounts.find(
            entry => entry.user === user.id || entry.user._id === user.id
        );
        return unreadEntry?.count || 0;
    };

    // New function to handle contact click
    const handleContactClick = (contactId) => {
        // Check if a conversation already exists with this contact
        const existingChat = chats.find(chat =>
            !chat.isGroup &&
            chat.participants.some(p => p._id === contactId)
        );

        if (existingChat) {
            // If conversation exists, open that chat
            userChatOpen(existingChat);
            // Navigate to chats tab
            toggleCustom('1');
        } else {
            // If no conversation exists, start a new one
            handleStartChat(contactId);
        }
    };

    return (
        <div className="chat-leftsidebar">
            <div className="chat-leftsidebar-header">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="chat-user-info d-flex align-items-center">
                        <DropImage userId={user} className="rounded-circle avatar-sm me-3" />
                        <div>
                            <h5 className="mb-0 fw-semibold">{user.firstName} {user.lastName}</h5>
                            <p className="text-muted mb-0 small">{t('chat.myConversations')}</p>
                        </div>
                    </div>
                    {/* <div className="chat-user-actions">
                        <UncontrolledDropdown>
                            <DropdownToggle tag="a" className="btn btn-ghost p-0" role="button">
                                <i className="ri-add-line fs-18"></i>
                            </DropdownToggle>
                            <DropdownMenu end className="dropdown-menu-sm">
                                <DropdownItem onClick={() => toggleCustom('2')}>
                                    <i className="ri-user-add-line me-2"></i>{t('chat.newChat')}
                                </DropdownItem>
                                {user.role === 'SyndicateAdmin' ? (
                                    <DropdownItem onClick={toggleGroupModal}>
                                        <i className="ri-team-line me-2"></i>{t('chat.createCoOwnerGroup')}
                                    </DropdownItem>
                                ) : (
                                    <DropdownItem onClick={toggleGroupModal}>
                                        <i className="ri-group-line me-2"></i>{t('chat.createGroup')}
                                    </DropdownItem>
                                )}
                            </DropdownMenu>
                        </UncontrolledDropdown>
                    </div> */}
                </div>
                <div className="search-box mt-3">
                    <div className="input-group rounded-pill bg-light">
                        <span className="input-group-text bg-transparent border-0">
                            <i className="ri-search-line text-muted"></i>
                        </span>
                        <input
                            onKeyUp={searchUsers}
                            id="search-user"
                            type="text"
                            className="form-control bg-transparent border-0"
                            placeholder={t('chat.searchPlaceholder')}
                        />
                    </div>
                </div>
            </div>

            <Nav tabs className="chat-nav-tabs">
                <NavItem>
                    <NavLink
                        className={classnames({ active: customActiveTab === '1' })}
                        onClick={() => toggleCustom('1')}
                    >
                        {t('chat.chats')}
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={classnames({ active: customActiveTab === '2' })}
                        onClick={() => {
                            toggleCustom('2');
                            dispatch(fetchAvailableContacts(currentBuildingId));
                        }}
                    >
                        {t('chat.contacts')}
                    </NavLink>

                </NavItem>
                {(user.role === 'SyndicateAdmin' || user.role === "Admin") && (
                    <NavItem>
                        <NavLink
                            className={classnames({ active: customActiveTab === '3' })}
                            onClick={() => toggleCustom('3')}
                        >
                            {t('chat.groups')}
                        </NavLink>
                    </NavItem>
                )}
            </Nav>

            <TabContent activeTab={customActiveTab} className="chat-tab-content">
                <TabPane tabId="1" id="chats">
                    {loading ? (
                        <div className="chat-loader">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">{t('chat.loading')}</span>
                            </div>
                        </div>
                    ) : chats.length > 0 ? (
                        <SimpleBar className="chat-room-list">
                            <h6 className="chat-list-title">{t('chat.messages')}</h6>
                            <ul className="chat-list chat-user-list users-list">
                                {chats.map((chat) => {
                                    const otherParticipant = !chat.isGroup ?
                                        chat.participants.find((p) => p._id !== user.id) :
                                        null;
                                    const unreadCount = chat.unreadCounts?.find((uc) => uc.user === user.id)?.count || 0;
                                    const isActive = activeChatId === chat._id;

                                    return (
                                        <li
                                            key={chat._id}
                                            className={`chat-item ${isActive ? 'active' : ''}`}
                                            onClick={() => userChatOpen(chat)}
                                        >
                                            <div className="chat-item-inner">
                                                <div className="chat-item-avatar">
                                                    {!chat.isGroup ? (
                                                        <>
                                                            <DropImage
                                                                userId={otherParticipant}
                                                                className="rounded-circle"
                                                            />
                                                            <span className={`user-status ${onlineUsers.includes(otherParticipant?._id) ? 'online' : 'offline'}`}></span>
                                                        </>
                                                    ) : (
                                                        <div className={`group-avatar ${chat.groupType === 'SyndicateAdmin-Coowner' ? 'coowner-group-avatar' :
                                                            chat.groupType === 'Admin-SyndicateAdmin' ? 'syndicate-group-avatar' :
                                                                chat.groupType === 'Admin-Worker' || chat.groupType === 'SyndicateAdmin-Worker' ? 'worker-group-avatar' : ''
                                                            }`}>
                                                            <span>#</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="chat-item-content">
                                                    <div className="chat-item-title-row">
                                                        <h6 className="chat-item-title">
                                                            {chat.isGroup ? (
                                                                <>
                                                                    {chat.groupName}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {otherParticipant?.firstName || t('chat.unknown')}
                                                                    {otherParticipant?.role && renderRoleBadge(otherParticipant.role)}
                                                                </>
                                                            )}
                                                        </h6>
                                                        <div className="chat-item-time">
                                                            {chat.lastMessage?.createdAt ? formatTimestamp(chat.lastMessage.createdAt) : ''}
                                                            {unreadCount > 0 && (
                                                                <Badge pill color="danger" className="chat-badge ms-1">
                                                                    {unreadCount}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="chat-item-last-msg">
                                                        {chat.lastMessage?.content?.text?.substring(0, 30) ||
                                                            (chat.lastMessage?.content?.media?.length ? t('chat.attachment') : '')}
                                                        {chat.lastMessage?.content?.text?.length > 30 && '...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </SimpleBar>
                    ) : (
                        <div className="chat-empty-state">
                            <div className="text-center">
                                <div className="chat-empty-icon">
                                    <i className="ri-chat-3-line"></i>
                                </div>
                                <h5>{t('chat.noConversationsYet')}</h5>
                                <p className="text-muted">{t('chat.startChatting')}</p>
                                <Button color="primary" className="mt-2" onClick={() => toggleCustom('2')}>
                                    {t('chat.startConversation')}
                                </Button>
                            </div>
                        </div>
                    )}
                </TabPane>
                <TabPane tabId="2" id="contacts">
                    <SimpleBar className="chat-contacts-list" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                        {loading ? (
                            <div className="chat-loader">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">{t('chat.loading')}</span>
                                </div>
                            </div>
                        ) : contacts.length > 0 ? (
                            <ul className="list-unstyled contact-list users-list">
                                {contacts
                                    .filter(u => u._id !== user.id)
                                    .map((contact) => (
                                        <li
                                            key={contact._id}
                                            className="contact-item"
                                            onClick={() => handleContactClick(contact._id)}
                                        >
                                            <div className="contact-item-inner">

                                                {/* Avatar + Online Status */}
                                                <div className="contact-avatar">
                                                    <DropImage userId={contact} className="rounded-circle" />
                                                    <span
                                                        className={`user-status ${onlineUsers.includes(contact._id) ? 'online' : 'offline'}`}
                                                    ></span>
                                                </div>

                                                {/* Contact Info */}
                                                <div className="contact-info">
                                                    <h6 className="contact-name">
                                                        {contact.firstName} {contact.lastName}
                                                    </h6>
                                                    <p className="contact-role">{t(`chat.roleLabels.${contact?.role}`)}</p>

                                                    <p className="contact-status">
                                                        {onlineUsers.includes(contact._id) ? t('chat.online') : t('chat.offline')}
                                                    </p>
                                                    {user.role === 'SyndicateAdmin' && contact?.role === 'SyndicateCoowner' && (
                                                        <p className="badge bg-primary">
                                                            {currentBuilding?.name}
                                                        </p>
                                                    )}

                                                </div>

                                                {/* Actions (Chat button, etc.) */}
                                                <div className="contact-actions">
                                                    <button className="btn btn-soft-primary btn-sm rounded-circle">
                                                        <i className="ri-chat-1-line"></i>
                                                    </button>
                                                </div>

                                            </div>
                                        </li>

                                    ))}
                            </ul>
                        ) : (
                            <div className="chat-empty-state">
                                <div className="text-center">
                                    <div className="chat-empty-icon">
                                        <i className="ri-user-search-line"></i>
                                    </div>
                                    <h5>{t('chat.noContactsAvailable')}</h5>
                                    <p className="text-muted">{t('chat.noContactsForBuilding')}</p>
                                </div>
                            </div>
                        )}
                    </SimpleBar>
                </TabPane>
                <TabPane tabId="3" id="groups">
                    <div className="groups-header d-flex justify-content-between align-items-center mb-3">
                        <h6 className="groups-title mb-0">{t('chat.myGroups')}</h6>
                        <Button color="soft-primary" size="sm" className="rounded-pill" onClick={toggleGroupModal}>
                            <i className="ri-add-line me-1"></i> {t('chat.createGroup')}
                        </Button>
                    </div>
                    <SimpleBar className="groups-list">
                        {loading ? (
                            <div className="chat-loader">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">{t('chat.loading')}</span>
                                </div>
                            </div>
                        ) : chats.filter(chat => chat.isGroup).length > 0 ? (
                            <ul className="list-unstyled group-list users-list">
                                {chats
                                    .filter(chat => chat.isGroup)
                                    .map((group) => {
                                        const unreadCount = group.unreadCounts?.find((uc) => uc.user === user.id)?.count || 0;
                                        const onlineMembersCount = group.participants
                                            .filter(p => onlineUsers.includes(p._id))
                                            .length;

                                        return (
                                            <li
                                                key={group._id}
                                                className={`group-item ${activeChatId === group._id ? 'active' : ''}`}
                                                onClick={() => userChatOpen(group)}
                                            >
                                                <div className="group-item-inner">
                                                    <div className={`group-avatar ${group.groupType === 'SyndicateAdmin-Coowner' ? 'coowner-group-avatar' :
                                                        group.groupType === 'Admin-SyndicateAdmin' ? 'syndicate-group-avatar' :
                                                            group.groupType === 'Admin-Worker' || group.groupType === 'SyndicateAdmin-Worker' ? 'worker-group-avatar' : ''
                                                        }`}>
                                                        <span className="group-icon">#</span>
                                                        <div className="group-members-indicator">
                                                            {onlineMembersCount} / {group.participants.length}
                                                        </div>
                                                    </div>
                                                    <div className="group-info">
                                                        <h6 className="group-name">{group.groupName}</h6>
                                                        <p className="group-last-message">
                                                            {group.lastMessage?.content?.text?.substring(0, 30) ||
                                                                (group.lastMessage?.content?.media?.length ? t('chat.attachment') : t('chat.noMessagesYet'))}
                                                            {group.lastMessage?.content?.text?.length > 30 && '...'}
                                                        </p>
                                                    </div>
                                                    {unreadCount > 0 && (
                                                        <Badge pill color="danger" className="group-badge">
                                                            {unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                            </ul>
                        ) : (
                            <div className="chat-empty-state">
                                <div className="text-center">
                                    <div className="chat-empty-icon">
                                        <i className="ri-group-line"></i>
                                    </div>
                                    <h5>{t('chat.noGroupsYet')}</h5>
                                    <p className="text-muted">{t('chat.createGroupToChat')}</p>
                                    <Button color="primary" className="mt-2" onClick={toggleGroupModal}>
                                        {t('chat.createAGroup')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </SimpleBar>
                </TabPane>
            </TabContent>
        </div>
    );
};

export default withTranslation()(ChatSidebar);