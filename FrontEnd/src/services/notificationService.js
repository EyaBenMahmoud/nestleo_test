import { store } from '../store';
import { setActiveChat } from '../slices/chat/reducer';

// Check if user is in the chat where the notification originated
export const isUserInChat = (chatId) => {
  const state = store.getState();
  return state.chat.activeChatId === chatId;
};

// Show browser notification if supported
export const showNotification = (data) => {
  // If user is already in this chat, don't show notification
  if (data.type === 'message' && data.chat && isUserInChat(data.chat)) {
    return;
  }

  // Check if we have permission for browser notifications
  if (Notification.permission === "granted") {
    try {
      const title = data.sender
        ? `${data.sender.firstName} ${data.sender.lastName || ''}`
        : (data.title || 'New notification');

      const body = data.content?.text || data.content || "You have a new notification";
      
      // Choose icon based on data content
      let icon = '/logo192.png'; // Default icon
      
      // If it's a claim notification (check for claimId)
      if (data.claimId) {
        // Use the static claim image if provided, otherwise default
        icon = data.claimImage || '/claim-icon.png';
      }

      const notification = new Notification(title, {
        body: body,
        icon: icon,
        badge: '/logo192.png',
        tag: data.claimId ? `claim-${data.claimId}` : `chat-${data.chat || Date.now()}`
      });

      notification.onclick = function () {
        window.focus();

        // Handle navigation based on notification type
        if (data.type === 'message' && data.relatedTo) {
          store.dispatch(setActiveChat(data.relatedTo));

          // Navigate to chat page if not already there
          if (window.location.pathname !== '/apps-chat') {
            window.location.href = '/apps-chat';
          } else {
            // If already on chat page, try to scroll to latest messages
            setTimeout(() => {
              const messagesContainer = document.querySelector('.chat-conversation-box');
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            }, 300);
          }
        } 
        else if (data.claimId) {
          // Navigate to claims page with claim ID
          window.location.href = `/Claim`;
        }

        notification.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  } else if (Notification.permission !== "denied") {
    // Request permission
    Notification.requestPermission();
  }
};

// Request notification permission on app load
export const requestNotificationPermission = () => {
  if ('Notification' in window) {
    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }
};