import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container,
  Button,
} from 'reactstrap';
import SimpleBar from 'simplebar-react';
import Picker from 'emoji-picker-react';
import { useSelector, useDispatch } from 'react-redux';
import { deleteMessageSocket } from '../../services/socketManager';
import {
  fetchUserChats,
  setActiveChat,
  fetchChatMessages,
  deleteChat,
  addNewMessage,
  fetchAvailableUsers,
  startIndividualChat,
  createRoleSpecificGroup,
  addParticipants,
  removeParticipant,
  updateGroup,
  fetchAvailableUsersForGroups,
  deleteMessage,
  updateMessagesReadStatus,
  clearSearchResults,
  searchMessages,
  messageDeleted
} from '../../slices/chat/reducer';
import { leaveChat, joinChat, sendMessage, emitTyping, markAsRead, getSocketInstance } from '../../services/socketManager';
import PersonalInfo from './PersonalInfo';
import userDummyImage from '../../assets/images/users/user-dummy-img.jpg';
import { toast } from 'react-toastify';
import './chat.css';
import { store } from '../../store';
import ChatModals from './chatModals';
import ChatSidebar from './ChatSideBar';
import ChatContent from './ChatContent';
import FilePreviewModal from './filePreviewModal';
import { fetchCoOwners } from '../../slices/buildings/building';
import { useTranslation } from 'react-i18next';

const Chat = () => {
  const dispatch = useDispatch();
  const userChatShow = useRef();
    const { t } = useTranslation();
  
  const messageBoxRef = useRef(null);
  const [customActiveTab, setCustomActiveTab] = useState('1');
  const [isInfoDetails, setIsInfoDetails] = useState(false);
  const [Chat_Box_Username, setChat_Box_Username] = useState('');
  const [Chat_Box_Image, setChat_Box_Image] = useState(userDummyImage);
  const [currentMessage, setCurrentMessage] = useState('');
  const [tempActiveChat, setTempActiveChat] = useState(null);
  const [search_Menu, setSearch_Menu] = useState(false);
  const [settings_Menu, setSettings_Menu] = useState(false);
  const [participantFilter, setParticipantFilter] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [reply, setReply] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeout = useRef(null);
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('SyndicateAdmin-Coowner'); // Default for SyndicateAdmin
  const [groupDescription, setGroupDescription] = useState('');
  const [coOwnerFilter, setCoOwnerFilter] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [manageGroupModal, setManageGroupModal] = useState(false);
  const [newParticipants, setNewParticipants] = useState([]);
  const [renameGroupModal, setRenameGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [adminGroupType, setAdminGroupType] = useState('Admin-SyndicateAdmin');

  const { contacts, chats, groupAvailableUsers = [], messages, activeChatId, onlineUsers = [], typingUsers = {}, loading, availableUsers = [] } = useSelector((state) => state.chat);
  const user = useSelector((state) => state.Loginn.user || {});

  // Get current chat details
  const currentChat = chats.find((chat) => chat._id === activeChatId);
  const currentMessages = activeChatId ? (messages[activeChatId] || []) : [];

  const currentBuilding = useSelector(state => state.Building.currentBuilding || {});
  const coOwners = useSelector(state => state.Building.coOwners || []);
  // Add these state variables inside the Chat component
  const [filePreviewModal, setFilePreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Add this function inside the Chat component
  const handleFilePreview = (file) => {
    setPreviewFile(file);
    setFilePreviewModal(true);
  };
  // Initialize socket and fetch data
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserChats());

    }
  }, [user, dispatch, currentBuilding?._id]);

  // Add event listener for the "Start a conversation" button in chat welcome
  useEffect(() => {
    const handleStartNewChat = () => toggleCustom('2');
    window.addEventListener('startNewChat', handleStartNewChat);
    return () => {
      window.removeEventListener('startNewChat', handleStartNewChat);
      leaveChat();
    };
  }, []);
  // Add a useEffect to listen for deletion events
  useEffect(() => {
    const handleMessageDeleted = (e) => {
      console.log("Message deleted event caught in component:", e.detail);
      // Force re-render by updating a state variable
      setForceUpdate(prev => !prev);
    };

    document.addEventListener('messageDeleted', handleMessageDeleted);

    return () => {
      document.removeEventListener('messageDeleted', handleMessageDeleted);
    };
  }, [activeChatId]);
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  // Set initial chat details on load
  useEffect(() => {
    if (chats.length > 0 && activeChatId) {
      const initialChat = chats.find((chat) => chat._id === activeChatId);
      if (initialChat) {
        userChatOpen(initialChat);
      }
    }
  }, [chats, activeChatId]);

  // Join chat and fetch messages when active chat changes
  useEffect(() => {
    if (activeChatId) {
      joinChat(activeChatId);
      dispatch(fetchChatMessages({ chatId: activeChatId }));
    }
  }, [activeChatId, dispatch]);

  const cleanupChat = () => {
    setTempActiveChat(null);
    setChat_Box_Image(userDummyImage); // Reset to default dummy image
    setChat_Box_Username('');
    setCurrentMessage('');
    setSelectedFile(null);
    setEmojiPicker(false);
    setReply(null);
  };

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (activeChatId && messages[activeChatId]?.length > 0) {
      scrollToBottom();
    }
  }, [messages, activeChatId, scrollToBottom]);

  // Mark all unread messages as read when viewing chat
  useEffect(() => {
    if (!activeChatId || !messages[activeChatId]) return;

    // Get the current user ID from the user object
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;

    // Find messages that aren't read by current user
    const unreadMessages = messages[activeChatId].filter(msg => {
      // Only check messages from others
      if (msg?.sender._id === currentUserId) return false;

      // Check if user is in the readBy list
      return !msg?.readBy?.some(readInfo =>
        readInfo?.user?._id === currentUserId ||
        readInfo?.user === currentUserId
      );
    });

    if (unreadMessages && unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map(msg => msg?._id);

      // Mark as read via socket
      markAsRead(activeChatId, unreadIds);
    }
  }, [activeChatId, messages, user]);

  // Toggle menus
  const toggleSearch = () => setSearch_Menu(!search_Menu);
  const toggleSettings = () => setSettings_Menu(!settings_Menu);
  const toggleInfo = () => setIsInfoDetails(!isInfoDetails);

  // Modify the toggleCustom function to refresh data when switching to Chats tab
  const toggleCustom = (tab) => {
    if (customActiveTab !== tab) {
      setCustomActiveTab(tab);

      // When switching to Chats tab (tab '1'), refresh the data
      if (tab === '1') {
        // Refresh chats data
        dispatch(fetchUserChats())
          .then(() => {
            console.log("Chats refreshed successfully");

            // If there's an active chat, refresh its messages too
            if (activeChatId) {
              dispatch(fetchChatMessages({ chatId: activeChatId }));

              // Also refresh the chat header information
              const chat = chats.find(c => c._id === activeChatId);
              if (chat) {
                userChatOpen(chat);
              }
            }
          })
          .catch(error => {
            console.error("Error refreshing chats:", error);
          });
      }
    }
  };

  const toggleGroupModal = () => {
    setGroupModal(!groupModal);
    if (!groupModal) {
      setGroupName('');
      setGroupDescription('');
      setSelectedParticipants([]);

      // Set appropriate default group type based on user role
      if (user.role === 'SyndicateAdmin') {
        setGroupType('SyndicateAdmin-Coowner');
      } else if (user.role === 'Admin') {
        // For Admin, set to the current adminGroupType or default to Admin-SyndicateAdmin
        setAdminGroupType('Admin-SyndicateAdmin');
      } else {
        // For other roles, use a generic type or whatever is appropriate
        setGroupType('Regular');
      }

      setParticipantFilter(''); // Reset the participant filter
    }
  };

  // Update the handleCreateGroup function to handle Admin's group type selection
  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      toast.error('Please enter a group name and select participants');
      return;
    }

    const participants = selectedParticipants.map(p => p.value);

    if (user.role === 'SyndicateAdmin') {
      dispatch(createRoleSpecificGroup({
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        participants,
        groupType: 'SyndicateAdmin-Coowner'
      }))
        .unwrap()
        .then((group) => {
          toggleGroupModal();
          toast.success('Co-owner group created successfully');
          userChatOpen(group);
        })
        .catch((err) => {
          toast.error(err || 'Failed to create group');
        });
    } else if (user.role === 'Admin') {
      // Add the missing .unwrap() and promise handling
      dispatch(createRoleSpecificGroup({
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        participants,
        groupType: adminGroupType
      }))
        .unwrap()
        .then((group) => {
          toggleGroupModal();
          toast.success(`${adminGroupType === 'Admin-SyndicateAdmin' ? 'Syndicate admin' : 'Worker'} group created successfully`);
          userChatOpen(group);
        })
        .catch((err) => {
          toast.error(err || 'Failed to create group');
          console.error('Group creation error:', err);
        });
    } else {
      dispatch(createGroupChat({
        groupName: groupName.trim(),
        participants
      }))
        .unwrap()
        .then((group) => {
          toggleGroupModal();
          toast.success('Group created successfully');
          userChatOpen(group);
        })
        .catch((err) => {
          toast.error('Failed to create group');
        });
    }
  };

  // When opening the manageGroupModal
  const toggleManageGroupModal = () => {
    setManageGroupModal(!manageGroupModal);
    if (!manageGroupModal) {
      dispatch(fetchAvailableUsersForGroups()); // Fetch fresh list of all potential participants
      setNewParticipants([]);
    }
  };

  const toggleRenameGroupModal = () => {
    setRenameGroupModal(!renameGroupModal);
    if (!renameGroupModal && currentChat) {
      setNewGroupName(currentChat.groupName || '');
      setNewGroupDescription(currentChat.groupDescription || '');
    }
  };

  const handleRenameGroup = async () => {
    if (!currentChat || !currentChat._id) {
      toast.error('Invalid group. Please select a valid group.');
      return;
    }

    if (!newGroupName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }

    try {
      await dispatch(updateGroup({
        chatId: currentChat._id,
        name: newGroupName.trim(),
        description: newGroupDescription.trim()
      })).unwrap();

      setChat_Box_Username(newGroupName.trim());
      toast.success('Group updated successfully');
      toggleRenameGroupModal();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(error?.message || 'Failed to update group');
    }
  };

  const getEligibleNewParticipants = () => {
    if (!currentChat) return [];

    const currentParticipantIds = currentChat.participants.map(p => p._id);

    // Filter based on group type and user role
    if (user.role === 'SyndicateAdmin' && currentChat.groupType === 'SyndicateAdmin-Coowner') {
      return availableUsers
        .filter(u => !currentParticipantIds.includes(u._id) && u.role === 'SyndicateCoowner')
        .map(u => ({
          value: u._id,
          label: `${u.firstName} ${u.lastName || ''}`,
          role: u.role
        }));
    } else if (user.role === 'Admin') {
      if (currentChat.groupType === 'Admin-SyndicateAdmin') {
        return availableUsers
          .filter(u => !currentParticipantIds.includes(u._id) && u.role === 'SyndicateAdmin')
          .map(u => ({
            value: u._id,
            label: `${u.firstName} ${u.lastName || ''}`,
            role: u.role
          }));
      } else if (currentChat.groupType === 'Admin-Worker') {
        return availableUsers
          .filter(u => !currentParticipantIds.includes(u._id) && u.role === 'Worker')
          .map(u => ({
            value: u._id,
            label: `${u.firstName} ${u.lastName || ''}`,
            role: u.role
          }));
      }
    }

    return [];
  };

  const handleAddParticipants = async () => {
    if (!currentChat || newParticipants.length === 0) return;

    try {
      await dispatch(
        addParticipants({
          chatId: currentChat._id,
          participantIds: newParticipants.map(p => p.value)
        })
      ).unwrap();

      toast.success('Participants added successfully');
      toggleManageGroupModal();
    } catch (error) {
      toast.error(error?.message || 'Failed to add participants');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!currentChat) return;

    try {
      await dispatch(
        removeParticipant({
          chatId: currentChat._id,
          participantId
        })
      ).unwrap();

      toast.success('Participant removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove participant');
    }
  };

  const userChatOpen = (chat) => {
    if (!chat) return;

    const isExistingConversation = chat._id === activeChatId;
    if (isExistingConversation && Chat_Box_Username) {
      return;
    }

    dispatch(setActiveChat(chat._id));
    joinChat(chat._id);
    setTempActiveChat(null);

    if (chat.isGroup) {
      setChat_Box_Username(chat.groupName || 'Group Chat');
      setChat_Box_Image(null);
    } else {
      const otherUser = chat.participants.find(p => p._id !== user.id);

      if (otherUser) {
        setChat_Box_Username(`${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim());
        setChat_Box_Image(otherUser.avatar ? otherUser : userDummyImage);
      } else {
        setChat_Box_Username('Unknown User');
        setChat_Box_Image(userDummyImage);
      }
    }

    dispatch(fetchChatMessages(chat._id));

    if (window.innerWidth < 992 && userChatShow.current) {
      userChatShow.current.classList.add("user-chat-show");
    }
  };

  const backToUserChat = () => {
    if (userChatShow.current) {
      userChatShow.current.classList.remove('user-chat-show');
    }
  };

  useEffect(() => {
    if (!activeChatId) {
      setTempActiveChat(null);
      setCurrentMessage('');
      setSelectedFile(null);
      setEmojiPicker(false);
    }
  }, [activeChatId]);

  const handleStartChat = (userId) => {
    const otherParticipant = availableUsers.find((u) => u._id === userId);
    if (!otherParticipant) return;

    const loadingToast = toast.loading('Starting conversation...');

    const existingChat = chats.find((chat) =>
      !chat.isGroup &&
      chat.participants.some(p => p._id === userId) &&
      chat.participants.some(p => p._id === user.id)
    );

    if (existingChat) {
      toast.dismiss(loadingToast);
      userChatOpen(existingChat);
    } else {
      dispatch(startIndividualChat({ participantId: userId }))
        .unwrap()
        .then((newChat) => {
          toast.dismiss(loadingToast);
          toast.success('Conversation started');

          dispatch(fetchUserChats())
            .then(() => {
              const refreshedChat = chats.find(c => c._id === newChat._id);
              if (refreshedChat) {
                userChatOpen(refreshedChat);
              } else {
                userChatOpen(newChat);
              }
            });
        })
        .catch((error) => {
          toast.dismiss(loadingToast);
          toast.error('Failed to start conversation');
          console.error("Chat start error:", error);
        });
    }
  };
  // Update the handleCopy function
  const handleCopy = (message) => {
    // Check if message is deleted
    if (message.deleted) {
      toast.info('Cannot copy a deleted message');
      return;
    }

    // Get text content to copy
    const textToCopy = message.content?.text || '';

    // Use clipboard API
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast.success('Message copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy message');
      });
  };
  // Update the handleSendMessage function

  const handleSendMessage = async (messageOrEvent) => {
    // Check if the argument is an event or a direct message string
    const message = typeof messageOrEvent === 'object' && messageOrEvent.preventDefault
      ? currentMessage  // It's an event object, use the currentMessage state
      : messageOrEvent;  // It's already a string

    // If it's an event, prevent the default form submission
    if (typeof messageOrEvent === 'object' && messageOrEvent.preventDefault) {
      messageOrEvent.preventDefault();
    }

    if ((!message || !message.trim()) && !selectedFile) return;

    // Clear typing indicator immediately on the UI side
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }

    setIsTyping(false);
    emitTyping(activeChatId, false);

    // Generate a tempId just for server tracking
    const tempId = Date.now().toString();

    // Get the replyTo data - pass the full reply object for optimistic UI, but only ID for server
    const replyToId = reply ? reply._id : null;
    const replyToObject = reply || null;

    try {
      // Send message through socket with reply data
      await sendMessage(activeChatId, message, tempId, selectedFile, replyToObject, replyToId);

      // Clear the message, file inputs, and reply
      setCurrentMessage('');
      setSelectedFile(null);
      setReply(null); // Clear the reply after sending

      // Close emoji picker if open
      if (emojiPicker) {
        setEmojiPicker(false);
      }
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Error sending message:", error);
    }
  };

  
  //test
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'SyndicateAdmin':
        return <span className="syndicate-admin-badge ms-2">Syndicate</span>;
      case 'SyndicateCoowner':
        return <span className="coowner-badge ms-2">Co-owner</span>;
      case 'Worker':
        return <span className="worker-badge ms-2">Worker</span>;
      case 'Admin':
        return <span className="admin-badge ms-2">Admin</span>;
      default:
        return null;
    }
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);

    if (activeChatId) {
      if (!isTyping && e.target.value.trim()) {
        setIsTyping(true);
        emitTyping(activeChatId, true);
      }

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        setIsTyping(false);
        emitTyping(activeChatId, false);
      }, 2000);
    }
  };

  const onKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && (currentMessage.trim() || selectedFile)) {
      e.preventDefault();
      handleSendMessage(currentMessage); // Pass the message string directly
    }
  };

  const searchUsers = () => {
    const input = document.getElementById('search-user');
    const filter = input.value.toUpperCase();
    const userList = document.getElementsByClassName('users-list');
    Array.prototype.forEach.call(userList, (el) => {
      const li = el.getElementsByTagName('li');
      for (let i = 0; i < li.length; i++) {
        const nameElement = li[i].querySelector('.chat-item-title') || li[i].querySelector('.contact-name');
        const txtValue = nameElement ? nameElement.textContent || nameElement.innerText : '';
        li[i].style.display = txtValue.toUpperCase().indexOf(filter) > -1 ? '' : 'none';
      }
    });
  };
  // Add a state to track active search
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add a function to clear search
  const clearSearch = () => {
    if (activeChatId) {
      dispatch(clearSearchResults(activeChatId));
      setSearchActive(false);
      setSearchQuery('');
      const searchInput = document.getElementById('searchMessage');
      if (searchInput) searchInput.value = '';
    }
  };

  // Update the searchMessagesHandler function
  const searchMessagesHandler = (e) => {
    // // Check if enter key was pressed or this is a submit event
    // if (e.type === 'submit' || (e.key === 'Enter' && !e.shiftKey)) {
    //   e.preventDefault();

    //   const searchInput = document.getElementById('searchMessage');
    //   const query = searchInput.value.trim();

    //   if (query && activeChatId) {
    //     dispatch(searchMessages({ chatId: activeChatId, query }))
    //       .unwrap()
    //       .then((results) => {
    //         setSearchActive(true);
    //         setSearchQuery(query);
    //       })
    //       .catch((error) => {
    //         toast.error('Error searching messages');
    //         console.error('Search error:', error);
    //       });
    //   } else if (!query) {
    //     // Clear search if query is empty
    //     dispatch(clearSearchResults(activeChatId));
    //     setSearchActive(false);
    //     setSearchQuery('');
    //   }
    // }
  };



  const onEmojiClick = (emojiObject) => {
    setCurrentMessage((prev) => prev + emojiObject.emoji);
    if (!isTyping) {
      setIsTyping(true);
      emitTyping(activeChatId || tempActiveChat?.participantId, true);
    }
  };


  // Replace the handleDeleteMessage function with this new version
  const handleDeleteMessage = async (messageId) => {
    if (!activeChatId || !messageId) return;

    try {
      await deleteMessageSocket(activeChatId, messageId);
      // No need for additional handling since the socket events will update Redux
    } catch (error) {
      console.error("Error deleting message:", error);
      // Error handling is already done in deleteMessageSocket
    }
  };
const formatTimestamp = (timestamp, fullDate = false) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // Check if same day
  const isToday = messageDate.toDateString() === now.toDateString();
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();
  
  // Check if same year
  const isThisYear = messageDate.getFullYear() === now.getFullYear();
  
  // Format the time part (used in all formats)
  const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (fullDate) {
    if (isToday) {
      return `${t('chat.today')} ${timeString}`;
    } else if (isYesterday) {
      return `${t('chat.yesterday')} ${timeString}`;
    } else if (isThisYear) {
      // Only month and day + time if same year
      return messageDate.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric' 
      }) + ` ${timeString}`;
    } else {
      // Full date for messages from previous years
      return messageDate.toLocaleDateString(undefined, { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric' 
      }) + ` ${timeString}`;
    }
  } else {
    // For non-group chats, just return time if today, otherwise date format
    if (isToday) {
      return timeString;
    } else if (isYesterday) {
      return `${t('chat.yesterday')} ${timeString}`;
    } else {
      return messageDate.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
};
  const renderMessageContent = (message) => {
    const { text, media } = message.content || {};
    // If message is deleted, show deletion notice with italic styling
    if (message.deleted) {
      return (
        <div className="ctext-content deleted-message">
          <i className="ri-delete-bin-line me-1"></i>
          <span >This message was deleted</span>
        </div>
      );
    }

    return (
      <div className="ctext-content">
        {/* Show reply info if this message is replying to another */}
        {message.replyTo && (
          <div className="reply-info mb-2">
            <div className="reply-bar">
              <div className="reply-header">
                <i className="ri-reply-line me-1"></i>
                <span className="reply-sender">
                  {message.replyTo.sender?.firstName || message.replyTo.sender?.name || 'User'}
                </span>
              </div>
              <div className="reply-preview">
                {message.replyTo.content?.text || 
                 (message.replyTo.content?.media?.length ? "📎 Attachment" : "Message")}
              </div>
            </div>
          </div>
        )}
        
        {text && <p className="mb-0">{text}</p>}
        {media && media.length > 0 && (
          <div className="message-media mt-2">
            {media.map((item, index) => (
              <div key={index} className="media-item mb-2">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="rounded shadow-sm message-image"
                    onClick={() => handleFilePreview(item)}
                  />
                ) : (
                  <div className="file-attachment d-flex align-items-center">
                    <i className="ri-file-text-line me-2 text-primary"></i>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-decoration-none"
                    >
                      {item.filename}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getParticipantOptions = () => {
    if (user.role === 'SyndicateAdmin') {
      // Filter to only show co-owners for SyndicateAdmin
      return availableUsers
        .filter(u => u._id !== user.id && u.role === 'SyndicateCoowner')
        .map(u => ({
          value: u._id,
          label: `${u.firstName} ${u.lastName || ''}`,
          role: u.role
        }));
    }

    return availableUsers
      .filter(u => u._id !== user.id)
      .map(u => ({
        value: u._id,
        label: `${u.firstName} ${u.lastName || ''}`,
        role: u.role
      }));
  };

  const handleDeleteactiveChat = () => {
    const chatId = activeChatId;
    if (chatId) {
      joinChat(null);
      const loadingToast = toast.loading("Deleting chat...");

      dispatch(deleteChat({ chatId: chatId }))
        .unwrap()
        .then(() => {
          toast.dismiss(loadingToast);
          setChat_Box_Username('');
          setChat_Box_Image(userDummyImage);
          dispatch(setActiveChat(null));
          setTempActiveChat(null);
          setCurrentMessage('');
          setSelectedFile(null);
          setEmojiPicker(false);
        })
        .catch((error) => {
          toast.dismiss(loadingToast);
          toast.error("Failed to delete chat");
          console.error("Error deleting chat:", error);
        });
    }
  };

  const getFilteredCoOwners = () => {
    const options = getParticipantOptions();
    if (!coOwnerFilter) return options;
    return options.filter(option => option.label.toLowerCase().includes(coOwnerFilter.toLowerCase()));
  };

  const getFilteredParticipantOptions = () => {
    let roleFilteredUsers = [];

    // Ajouter des vérifications défensives pour chaque variable
    const safeCoOwners = Array.isArray(coOwners) ? coOwners : [];
    const safeGroupUsers = Array.isArray(groupAvailableUsers) ? groupAvailableUsers : [];

    if (user?.role === 'SyndicateAdmin') {
      roleFilteredUsers = safeCoOwners;
    } else if (user?.role === 'Admin') {
      if (adminGroupType === 'Admin-SyndicateAdmin') {
        roleFilteredUsers = safeGroupUsers.filter(u =>
          u && u._id !== user?.id && u.role === 'SyndicateAdmin'
        );
      } else if (adminGroupType === 'Admin-Worker') {
        roleFilteredUsers = safeGroupUsers.filter(u =>
          u && u._id !== user?.id && u.role === 'Worker'
        );
      }
    } else {
      roleFilteredUsers = safeGroupUsers.filter(u => u && u._id !== user?.id);
    }

    if (participantFilter && Array.isArray(roleFilteredUsers) && roleFilteredUsers.length > 0) {
      const searchTerm = participantFilter.toLowerCase();
      roleFilteredUsers = roleFilteredUsers.filter(u =>
        u && `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(searchTerm)
      );
    }

    return (roleFilteredUsers || []).map(u => ({
      value: u?._id || '',
      label: `${u?.firstName || ''} ${u?.lastName || ''}`.trim(),
      role: u?.role || ''
    }));
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <div className="chat-container">
            <div className="chat-wrapper d-lg-flex">
              {/* ChatSidebar Component */}
              <ChatSidebar
                currentBuilding={currentBuilding}
                currentBuildingId={currentBuilding?._id}
                // Pass other existing props
                customActiveTab={customActiveTab}
                toggleCustom={toggleCustom}
                toggleGroupModal={toggleGroupModal}
                userChatOpen={userChatOpen}
                searchUsers={searchUsers}
                handleStartChat={handleStartChat}
                loading={loading}
              // Add the current building ID prop
              />

              {/* ChatContent Component */}
              <div className="user-chat" ref={userChatShow}>
                <ChatContent
                  // Chat display props
                  activeChatId={activeChatId}
                  tempActiveChat={tempActiveChat}
                  currentChat={currentChat}
                  searchResults={messages[activeChatId]?.searchResults || []}
                  Chat_Box_Username={Chat_Box_Username}
                  Chat_Box_Image={Chat_Box_Image}
                  onlineUsers={onlineUsers}
                  clearSearch={clearSearch}
                  searchQuery={searchQuery}
                  searchActive={searchActive}
                  loading={loading}
                  currentMessages={currentMessages}
                  typingUsers={typingUsers}
                  user={user}

                  // Message handling
                  currentMessage={currentMessage}
                  setCurrentMessage={setCurrentMessage}
                  handleInputChange={handleInputChange}
                  onKeyPress={onKeyPress}
                  handleSendMessage={handleSendMessage}
                  renderMessageContent={renderMessageContent}
                  formatTimestamp={formatTimestamp}
                  setReply={setReply}
                  reply={reply}
                  handleDeleteMessage={handleDeleteMessage}
                  handleCopy={handleCopy}

                  // UI state
                  search_Menu={search_Menu}
                  toggleSearch={toggleSearch}
                  settings_Menu={settings_Menu}
                  toggleSettings={toggleSettings}
                  toggleInfo={toggleInfo}
                  messageBoxRef={messageBoxRef}
                  backToUserChat={backToUserChat}
                  emojiPicker={emojiPicker}
                  setEmojiPicker={setEmojiPicker}
                  onEmojiClick={onEmojiClick}

                  // File handling
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  fileInputRef={fileInputRef}
                  openFileDialog={openFileDialog}

                  // Group management
                  toggleManageGroupModal={toggleManageGroupModal}
                  toggleRenameGroupModal={toggleRenameGroupModal}
                  handleDeleteactiveChat={handleDeleteactiveChat}

                  // Search
                  searchMessagesHandler={searchMessagesHandler}
                />
              </div>
            </div>
          </div>
        </Container>
      </div>


      <PersonalInfo
        onlineUsers={onlineUsers}
        show={isInfoDetails}
        onCloseClick={() => setIsInfoDetails(false)}
        currentuser={Chat_Box_Username}
        userId={currentChat?.isGroup ? null : currentChat?.participants?.find((p) => p._id !== user.id)?._id}
        cuurentiseImg={Chat_Box_Image}
        participant={
          !currentChat?.isGroup
            ? currentChat?.participants?.find((p) => p._id !== user.id)
            : null
        }
        isGroup={currentChat?.isGroup || false}
      />

      <FilePreviewModal
        isOpen={filePreviewModal}
        toggle={() => setFilePreviewModal(!filePreviewModal)}
        file={previewFile}
      />
      {/* Chat Modals */}
      <ChatModals
        // Group creation modal props
        groupModal={groupModal}
        toggleGroupModal={toggleGroupModal}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDescription={groupDescription}
        setGroupDescription={setGroupDescription}
        selectedParticipants={selectedParticipants}
        setSelectedParticipants={setSelectedParticipants}
        adminGroupType={adminGroupType}
        setAdminGroupType={setAdminGroupType}
        participantFilter={participantFilter}
        setParticipantFilter={setParticipantFilter}
        coOwnerFilter={coOwnerFilter}
        setCoOwnerFilter={setCoOwnerFilter}
        getFilteredCoOwners={getFilteredCoOwners}
        getFilteredParticipantOptions={getFilteredParticipantOptions}

        // Group management modal props
        manageGroupModal={manageGroupModal}
        toggleManageGroupModal={toggleManageGroupModal}
        currentChat={currentChat}
        user={user}
        newParticipants={newParticipants}
        setNewParticipants={setNewParticipants}
        getEligibleNewParticipants={getEligibleNewParticipants}

        // Rename group modal props
        renameGroupModal={renameGroupModal}
        toggleRenameGroupModal={toggleRenameGroupModal}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroupDescription={newGroupDescription}
        setNewGroupDescription={setNewGroupDescription}

        // Common props
        userChatOpen={userChatOpen}
      />
    </React.Fragment>
  );
};

export default Chat;