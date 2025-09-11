import React, { useRef } from 'react';
import {
    Button,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Dropdown,
    Input
} from 'reactstrap';
import { useTranslation, withTranslation } from 'react-i18next';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import Picker from 'emoji-picker-react';
import DropImage from '../../Components/Common/displayDropdown';

const ChatContent = ({
    // Chat display props
    activeChatId,
    tempActiveChat,
    currentChat,
    Chat_Box_Username,
    Chat_Box_Image,
    onlineUsers,
    loading,
    currentMessages,
    typingUsers,
    user,
    searchResults,

    // Message handling
    currentMessage,
    setCurrentMessage,
    handleInputChange,
    onKeyPress,
    handleSendMessage,
    renderMessageContent,

    formatTimestamp,
    setReply,
    reply,
    handleDeleteMessage,
    handleCopy,

    // UI state
    search_Menu,
    searchActive,
    searchQuery,

    toggleSearch,
    settings_Menu,
    toggleSettings,
    toggleInfo,
    messageBoxRef,
    backToUserChat,
    emojiPicker,
    setEmojiPicker,
    onEmojiClick,
    clearSearch,

    // File handling
    selectedFile,
    setSelectedFile,
    fileInputRef,
    openFileDialog,

    // Group management
    toggleManageGroupModal,
    toggleRenameGroupModal,
    handleDeleteactiveChat,

    // Search
    searchMessagesHandler,
    
}) => {
  const { t } = useTranslation();
    // Helper to render typing indicator
    const renderTypingIndicator = () => {
        if (!activeChatId || !typingUsers[activeChatId] || typingUsers[activeChatId].length === 0) return null;

        const typingUserNames = typingUsers[activeChatId]
            .filter((id) => id !== user.id)
            .map((id) => {
                if (currentChat?.isGroup) {
                    const participant = currentChat.participants.find((p) => p._id === id);
                    return participant?.firstName || t('chat.someone');
                } else {
                    return Chat_Box_Username;
                }
            });

        if (typingUserNames.length === 0) return null;

        return (
            <li className="chat-list left">
                <div className="conversation-list">
                    {currentChat?.isGroup ? (
                        <div className={`chat-group-avatar-xs me-1 ${currentChat.groupType === 'SyndicateAdmin-Coowner' ? 'coowner-group-avatar' :
                            currentChat.groupType === 'Admin-SyndicateAdmin' ? 'syndicate-group-avatar' :
                                currentChat.groupType === 'Admin-Worker' || currentChat.groupType === 'SyndicateAdmin-Worker' ? 'worker-group-avatar' : ''
                            }`}>
                            <span className="group-icon-xs">#</span>
                        </div>
                    ) : (
                        <div className="chat-avatar">
                            <DropImage
                                userId={currentChat?.participants.find((p) => p._id !== user.id)}
                                className="rounded-circle avatar-xs"
                            />
                        </div>
                    )}
                    <div className="user-chat-content">
                        <div className="typing-indicator-container">
                            <div className="typing-indicator">
                                <div className="typing-indicator-bubble">
                                    <div className="typing-indicator-dot"></div>
                                    <div className="typing-indicator-dot"></div>
                                    <div className="typing-indicator-dot"></div>
                                </div>
                                <div className="typing-indicator-text">
                                    {typingUserNames.join(', ')} {typingUserNames.length > 1 ? t('chat.areTyping') : t('chat.isTyping')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </li>
        );
    };

    return (
        <>
            {(activeChatId || tempActiveChat) ? (
                <div className="chat-content">
                    <div className="chat-header">
                        <div className="d-flex align-items-center">
                            <div className="d-block d-lg-none me-2">
                                <a href="#" onClick={backToUserChat} className="user-chat-back">
                                    <i className="ri-arrow-left-s-line"></i>
                                </a>
                            </div>
                            <div className="chat-user d-flex align-items-center">
                                {!currentChat?.isGroup ? (
                                    <div className="chat-user-avatar me-3">
                                        <DropImage
                                            userId={
                                                currentChat
                                                    ? currentChat.participants.find((p) => p._id !== user.id)
                                                    : tempActiveChat
                                            }
                                            className="rounded-circle"
                                        />
                                        <span className={`user-status ${currentChat
                                            ? onlineUsers.includes(
                                                currentChat.participants.find((p) => p._id !== user.id)?._id
                                            )
                                                ? 'online'
                                                : 'offline'
                                            : onlineUsers.includes(tempActiveChat?.participantId)
                                                ? 'online'
                                                : 'offline'
                                            }`}></span>
                                    </div>
                                ) : (
                                    <div className={`chat-group-avatar me-3 ${currentChat.groupType === 'SyndicateAdmin-Coowner' ? 'coowner-group-avatar' :
                                        currentChat.groupType === 'Admin-SyndicateAdmin' ? 'syndicate-group-avatar' :
                                            currentChat.groupType === 'Admin-Worker' || currentChat.groupType === 'SyndicateAdmin-Worker' ? 'worker-group-avatar' : ''
                                        }`}>
                                        <span className="group-icon" style={{ color: 'white' }}>#</span>
                                    </div>
                                )}
                                <div className="chat-user-info">
                                    <h6 className="chat-user-name mb-0">
                                        <a href="#" onClick={toggleInfo}>
                                            {Chat_Box_Username}
                                            {currentChat?.isGroup && currentChat.groupType && (
                                                <small className="ms-1 text-muted">
                                                    ({currentChat.groupType === 'SyndicateAdmin-Coowner' ? t('chat.groupTypes.coOwners') :
                                                        currentChat.groupType === 'Admin-SyndicateAdmin' ? t('chat.groupTypes.syndicateAdmins') :
                                                            currentChat.groupType === 'Admin-Worker' || currentChat.groupType === 'SyndicateAdmin-Worker' ? t('chat.groupTypes.workers') : t('chat.groupTypes.group')})
                                                </small>
                                            )}
                                        </a>
                                    </h6>
                                    {typingUsers &&
                                        activeChatId &&
                                        Array.isArray(typingUsers[activeChatId]) &&
                                        typingUsers[activeChatId].filter(id => id !== user.id).length > 0 ? (
                                        <span className="chat-user-typing">{t('chat.typing')}</span>
                                    ) : !currentChat?.isGroup ? (
                                        <span className="chat-user-status">
                                            {currentChat
                                                ? onlineUsers.includes(
                                                    currentChat.participants.find((p) => p._id !== user.id)?._id
                                                )
                                                    ? t('chat.online')
                                                    : t('chat.offline')
                                                : onlineUsers.includes(tempActiveChat?.participantId)
                                                    ? t('chat.online')
                                                    : t('chat.offline')}
                                        </span>
                                    ) : (
                                        <span className="chat-group-members">
                                            {currentChat?.participants.length} {t('chat.members')} • {currentChat?.participants.filter(p => onlineUsers.includes(p._id)).length} {t('chat.online')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="chat-header-actions">
                            <div className="d-flex align-items-center">
                                {((user.role === 'SyndicateAdmin' && currentChat?.isGroup && currentChat?.groupType === 'SyndicateAdmin-Coowner') ||
                                    (user.role === 'Admin' && currentChat?.isGroup &&
                                        (currentChat?.groupType === 'Admin-SyndicateAdmin' || currentChat?.groupType === 'Admin-Worker') &&
                                        currentChat?.createdBy === user.id)) && (
                                        <button className="btn btn-ghost me-2" onClick={toggleManageGroupModal}>
                                            <i className="ri-user-settings-line"></i>
                                        </button>
                                    )}
                                <Dropdown isOpen={settings_Menu} toggle={toggleSettings}>
                                    <DropdownToggle tag="a" className="btn btn-ghost">
                                        <i className="ri-more-2-fill"></i>
                                    </DropdownToggle>
                                    <DropdownMenu end>
                                        <DropdownItem onClick={toggleInfo}>
                                            <i className="ri-user-line me-2 text-muted"></i>
                                            {currentChat?.isGroup ? t('chat.viewGroupInfo') : t('chat.viewProfile')}
                                        </DropdownItem>

                                        {/* Add Admin group management options */}
                                        {currentChat?.isGroup &&
                                            ((user.role === 'SyndicateAdmin' && currentChat?.groupType === 'SyndicateAdmin-Coowner') ||
                                                (user.role === 'Admin' &&
                                                    (currentChat?.groupType === 'Admin-SyndicateAdmin' || currentChat?.groupType === 'Admin-Worker') &&
                                                    currentChat?.createdBy === user.id)) && (
                                                <>
                                                    <DropdownItem onClick={toggleManageGroupModal}>
                                                        <i className="ri-user-settings-line me-2 text-muted"></i>
                                                        {user.role === 'SyndicateAdmin' ? t('chat.manageCoOwners') :
                                                            currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.manageSyndicateAdmins') : t('chat.manageWorkers')}
                                                    </DropdownItem>
                                                    <DropdownItem onClick={toggleRenameGroupModal}>
                                                        <i className="ri-edit-box-line me-2 text-muted"></i>{t('chat.renameGroup')}
                                                    </DropdownItem>
                                                </>
                                            )}
                                        <DropdownItem onClick={() => handleDeleteactiveChat()}>
                                            <i className="ri-delete-bin-line me-2 text-danger"></i>{t('chat.deleteChat')}
                                        </DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                            </div>
                        </div>
                    </div>

                    <div className="chat-messages">
                        <PerfectScrollbar
                            className="chat-conversation-box"
                            containerRef={(ref) => (messageBoxRef.current = ref)}
                        >
                            {loading ? (
                                <div className="chat-loader">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">{t('chat.loading')}</span>
                                    </div>
                                </div>
                            ) : searchActive && searchResults && searchResults[activeChatId]?.length > 0 ? (
                                // Display search results
                                <ul className="chat-conversation-list search-results">
                                    <div className="search-results-header">
                                        <span>{searchResults[activeChatId].length} {t('chat.resultsFound')}</span>
                                    </div>
                                    {searchResults[activeChatId].map((message) => (
                                        // Render message with search highlight
                                        <li
                                            key={message._id}
                                            className={`chat-message search-result ${message.sender._id === user.id ? 'outgoing' : 'incoming'}`}
                                        >
                                            {/* Use the same message rendering structure but with highlighted text */}
                                            {/* ... */}
                                        </li>
                                    ))}
                                </ul>
                            ) : currentMessages.length > 0 ? (

                                <ul className="chat-conversation-list">
                                    {currentMessages.map((message) => (
                                        <li
                                            key={message._id || message.tempId}
                                            className={`chat-message ${message.sender._id === user.id ? 'outgoing' : 'incoming'}${message.replyTo ? ' is-reply' : ''}`}
                                        >
                                            {message.sender._id !== user.id && (
                                                <div className="chat-avatar">
                                                    <DropImage
                                                        userId={message.sender}
                                                        className="rounded-circle"
                                                    />
                                                </div>
                                            )}
                                            <div className="chat-bubble-container">
                                                <div className="chat-bubble">
                                                    <div className="chat-bubble-content">
                                                        {/* Show sender name for group chats on incoming messages */}
                                                        {currentChat?.isGroup && message.sender._id !== user.id && (
                                                            <div className="message-sender-name">
                                                                {message.sender.firstName} {message.sender.lastName}
                                                            </div>
                                                        )}
                                                        {renderMessageContent(message)}
                                                    </div>
                                                    <div className="chat-bubble-actions">
                                                        <UncontrolledDropdown>
                                                            <DropdownToggle tag="a" className="chat-bubble-menu">
                                                                <i className="ri-more-2-fill"></i>
                                                            </DropdownToggle>
                                                            <DropdownMenu end>
                                                                <DropdownItem onClick={() => setReply(message)}>
                                                                    <i className="ri-reply-line me-2"></i>{t('chat.reply')}
                                                                </DropdownItem>
                                                                <DropdownItem onClick={() => handleCopy(message)}>
                                                                    <i className="ri-file-copy-line me-2"></i>{t('chat.copy')}
                                                                </DropdownItem>
                                                                {message.sender._id === user.id && (
                                                                    <DropdownItem onClick={() => handleDeleteMessage(message._id)} className="text-danger">
                                                                        <i className="ri-delete-bin-line me-2"></i>{t('chat.delete')}
                                                                    </DropdownItem>
                                                                )}
                                                            </DropdownMenu>
                                                        </UncontrolledDropdown>
                                                    </div>
                                                </div>
                                                <div className="chat-message-info">
                                                    {/* Show sender's first name alongside timestamp for group chats */}
                                                    {currentChat?.isGroup ? (
                                                        <span className="chat-time">
                                                            {message.sender._id === user.id ? t('chat.you') + " • " : null} {formatTimestamp(message.createdAt, true)}
                                                        </span>
                                                    ) : (
                                                        <span className="chat-time">{formatTimestamp(message.createdAt)}</span>
                                                    )}

                                                    {message.sender._id === user.id && (
                                                        <span className="chat-status">
                                                            {message.readBy?.length > 1 ? (
                                                                <i className="ri-check-double-line text-success" title={t('chat.read')}></i>
                                                            ) : (
                                                                <i className="ri-check-line" title={t('chat.sent')}></i>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                    {renderTypingIndicator()}
                                </ul>
                            ) : (
                                <div className="chat-empty-state">
                                    <div className="text-center">
                                        <div className="chat-empty-icon">
                                            <i className="ri-chat-3-line"></i>
                                        </div>
                                        <h5>{t('chat.noMessagesYet')}</h5>
                                        <p className="text-muted">{t('chat.startConversation')}</p>

                                    </div>
                                </div>
                            )}
                        </PerfectScrollbar>
                    </div>

                    {reply && (
                        <div className="reply-card">
                            <div className="reply-content">
                                <div>
                                    <span className="reply-to fw-semibold">
                                        {t('chat.replyTo')} {reply.sender.firstName}
                                    </span>
                                    <p className="reply-text text-truncate">
                                        {reply.content?.text || (reply.content?.media?.length ? t('chat.attachment') : "")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setReply(null)}
                                ></button>
                            </div>
                        </div>
                    )}

                    <div className="chat-input">
                        <div className="chat-input-container">
                            <div className="chat-input-actions">
                                <button
                                    className="btn btn-ghost action-btn"
                                    onClick={() => setEmojiPicker(!emojiPicker)}
                                >
                                    <i className="ri-emotion-line"></i>
                                </button>
                                <button
                                    className="btn btn-ghost action-btn"
                                    onClick={openFileDialog}
                                >
                                    <i className="ri-attachment-2"></i>
                                </button>
                            </div>
                            <div className="chat-input-field">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={handleInputChange}
                                    onKeyPress={onKeyPress}
                                    className="form-control"
                                    placeholder={t('chat.typeMessage')}
                                />
                                {emojiPicker && (
                                    <div className="emoji-picker-container">
                                        <Picker onEmojiClick={onEmojiClick} />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setSelectedFile(file);
                                        }
                                    }}
                                    accept="image/*"
                                />
                            </div>
                            <div className="chat-input-send">
                                <button
                                    onClick={handleSendMessage}
                                    className="btn btn-primary rounded-circle send-btn"
                                    disabled={!currentMessage.trim() && !selectedFile}
                                >
                                    <i className="ri-send-plane-fill"></i>
                                </button>
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="file-preview">
                                <div className="file-preview-content">
                                    {selectedFile.type.startsWith('image/') ? (
                                        <div className="file-preview-image">
                                            <img
                                                src={URL.createObjectURL(selectedFile)}
                                                alt={t('chat.preview')}
                                            />
                                        </div>
                                    ) : (
                                        <div className="file-preview-icon">
                                            <i className="ri-file-line"></i>
                                        </div>
                                    )}
                                    <div className="file-preview-info">
                                        <span className="file-name">{selectedFile.name}</span>
                                        <span className="file-size">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </span>
                                    </div>
                                    <button
                                        className="btn-close"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = null;
                                        }}
                                    ></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="chat-welcome">
                    <div className="chat-welcome-content">
                        <div className="chat-welcome-icon">
                            <i className="ri-chat-smile-2-line"></i>
                        </div>
                        <h3>{t('chat.welcomeToChat')}</h3>
                        <p>{t('chat.selectOrStartConversation')}</p>
                        <Button
                            color="primary"
                            className="mt-3"
                            onClick={() => window.dispatchEvent(new CustomEvent("startNewChat"))}
                        >
                            {t('chat.startConversation')}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
};

export default withTranslation()(ChatContent);