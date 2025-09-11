import React, { useState, useRef, useEffect } from 'react';
import {
  Card, Button, Input, InputGroup, 
  Spinner, Badge, Alert, UncontrolledDropdown, 
  DropdownToggle, DropdownMenu, DropdownItem
} from 'reactstrap';
import { useDispatch, useSelector } from 'react-redux';
import FeatherIcon from 'feather-icons-react';
import './PlatformAssistant.css';
import { 
  getActiveConfig, 
  getAllActiveConfigs, 
  setCurrentLanguage 
} from '../../slices/Assistant/assistantConfigSlice';
import assistant from "../../../src/assets/images/call-center.png";

// Translation dictionary for UI elements
const uiTranslations = {
  en: {
    askNestly: "Ask Nestleo",
    loading: "Loading...",
    retry: "Retry",
    assistantTitle: "Nestleo Assistant",
    personalizedFor: "Personalized for",
    intelligentHelper: "Intelligent platform helper",
    clearConversation: "Clear conversation",
    topics: "Topics",
    suggestedQuestions: "Suggested Questions:",
    generalHelp: "General Help",
    askQuestion: "Ask any question about Nestleo...",
    thinking: "Your Nestleo Assistant is Thinking..."
  },
  fr: {
    askNestly: "Demander à Nestleo",
    loading: "Chargement...",
    retry: "Réessayer",
    assistantTitle: "Assistant Nestleo",
    personalizedFor: "Personnalisé pour",
    intelligentHelper: "Assistant intelligent de la plateforme",
    clearConversation: "Effacer la conversation",
    topics: "Sujets",
    suggestedQuestions: "Questions suggérées :",
    generalHelp: "Aide générale",
    askQuestion: "Posez une question sur Nestleo...",
    thinking: "Réflexion en cours..."
  },
  es: {
    askNestly: "Preguntar a Nestleo",
    loading: "Cargando...",
    retry: "Reintentar",
    assistantTitle: "Asistente Nestleo",
    personalizedFor: "Personalizado para",
    intelligentHelper: "Asistente inteligente de la plataforma",
    clearConversation: "Borrar conversación",
    topics: "Temas",
    suggestedQuestions: "Preguntas sugeridas:",
    generalHelp: "Ayuda general",
    askQuestion: "Haz cualquier pregunta sobre Nestleo...",
    thinking: "Pensando..."
  },
  it: {
    askNestly: "Chiedi a Nestleo",
    loading: "Caricamento...",
    retry: "Riprova",
    assistantTitle: "Assistente Nestleo",
    personalizedFor: "Personalizzato per",
    intelligentHelper: "Assistente intelligente della piattaforma",
    clearConversation: "Cancella conversazione",
    topics: "Argomenti",
    suggestedQuestions: "Domande suggerite:",
    generalHelp: "Aiuto generale",
    askQuestion: "Fai qualsiasi domanda su Nestleo...",
    thinking: "Sto pensando..."
  }
};

// Conversation phrases translations
const conversationTranslations = {
  en: {
    greetings: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
      hello: "Hello"
    },
    responses: {
      welcome: "How can I help you today?",
      thankYou: "You're welcome! Is there anything else I can help you with?",
      goodbye: "Goodbye! Feel free to ask if you need any help with Nestleo in the future. You can close this chat or ask a new question anytime.",
      howAreYou: "I'm doing well, thanks for asking! I'm here to help you with any questions about Nestleo. What can I assist you with today?",
      identity: "I'm the Nestleo Assistant, designed to help you navigate and use the Nestleo platform effectively. I can answer questions about buildings, claims, tasks, events, and other platform features. How can I help you today?",
      joke: "Why don't scientists trust atoms? Because they make up everything! Now, how can I help you with Nestleo today?",
      weather: "I'm sorry, I don't have real-time weather information. I'm focused on helping you with the Nestleo platform.",
      love: "That's very kind! I'm here to help you with Nestleo. What questions do you have about the platform?",
      topicHelp: "I can help you with {topicName} questions. Here are some common topics people ask about:",
      noPermission: "Sorry, you don't have access to {topicId} information based on your current role. Here are some questions I can help with instead:",
      noSpecificAnswer: "I'm not sure I understand your question. Could you please rephrase it or select one of the suggested questions below?",
      topicResponse: "I can help you with questions about {topicName}. Please ask a specific question or select one of the suggested questions below."
    }
  },
  fr: {
    greetings: {
      morning: "Bonjour",
      afternoon: "Bon après-midi",
      evening: "Bonsoir",
      hello: "Bonjour"
    },
    responses: {
      welcome: "Comment puis-je vous aider aujourd'hui ?",
      thankYou: "Je vous en prie ! Y a-t-il autre chose que je puisse faire pour vous ?",
      goodbye: "Au revoir ! N'hésitez pas à revenir si vous avez besoin d'aide avec Nestleo. Vous pouvez fermer cette conversation ou poser une nouvelle question à tout moment.",
      howAreYou: "Je vais bien, merci de demander ! Je suis là pour vous aider avec toutes vos questions sur Nestleo. Comment puis-je vous assister aujourd'hui ?",
      identity: "Je suis l'Assistant Nestleo, conçu pour vous aider à naviguer et utiliser la plateforme Nestleo efficacement. Je peux répondre aux questions sur les immeubles, les réclamations, les tâches, les événements et d'autres fonctionnalités de la plateforme. Comment puis-je vous aider aujourd'hui ?",
      joke: "Pourquoi les scientifiques ne font-ils pas confiance aux atomes ? Parce qu'ils inventent tout ! Maintenant, comment puis-je vous aider avec Nestleo aujourd'hui ?",
      weather: "Je suis désolé, je n'ai pas d'informations météorologiques en temps réel. Je suis concentré sur l'aide concernant la plateforme Nestleo.",
      love: "C'est très gentil ! Je suis là pour vous aider avec Nestleo. Quelles questions avez-vous sur la plateforme ?",
      topicHelp: "Je peux vous aider avec des questions sur {topicName}. Voici des sujets fréquemment abordés :",
      noPermission: "Désolé, vous n'avez pas accès aux informations sur {topicId} selon votre rôle actuel. Voici quelques questions auxquelles je peux répondre à la place :",
      noSpecificAnswer: "Je ne comprends pas bien votre question. Pourriez-vous la reformuler ou sélectionner l'une des questions suggérées ci-dessous ?",
      topicResponse: "Je peux vous aider avec des questions sur {topicName}. Veuillez poser une question spécifique ou sélectionner l'une des questions suggérées ci-dessous."
    }
  },
  es: {
    greetings: {
      morning: "Buenos días",
      afternoon: "Buenas tardes",
      evening: "Buenas noches",
      hello: "¡Hola"
    },
    responses: {
      welcome: "¿Cómo puedo ayudarte hoy?",
      thankYou: "¡De nada! ¿Hay algo más en lo que pueda ayudarte?",
      goodbye: "¡Adiós! No dudes en preguntar si necesitas ayuda con Nestleo en el futuro. Puedes cerrar este chat o hacer una nueva pregunta en cualquier momento.",
      howAreYou: "¡Estoy bien, gracias por preguntar! Estoy aquí para ayudarte con cualquier pregunta sobre Nestleo. ¿En qué puedo ayudarte hoy?",
      identity: "Soy el Asistente Nestleo, diseñado para ayudarte a navegar y usar la plataforma Nestleo de manera efectiva. Puedo responder preguntas sobre edificios, reclamos, tareas, eventos y otras funciones de la plataforma. ¿Cómo puedo ayudarte hoy?",
      joke: "¿Por qué los científicos no confían en los átomos? ¡Porque lo componen todo! Ahora, ¿cómo puedo ayudarte con Nestleo hoy?",
      weather: "Lo siento, no tengo información del clima en tiempo real. Me centro en ayudarte con la plataforma Nestleo.",
      love: "¡Eres muy amable! Estoy aquí para ayudarte con Nestleo. ¿Qué preguntas tienes sobre la plataforma?",
      topicHelp: "Puedo ayudarte con preguntas sobre {topicName}. Aquí hay algunos temas comunes sobre los que la gente pregunta:",
      noPermission: "Lo siento, no tienes acceso a la información de {topicId} según tu rol actual. Aquí hay algunas preguntas con las que puedo ayudarte en su lugar:",
      noSpecificAnswer: "No estoy seguro de entender tu pregunta. ¿Podrías reformularla o seleccionar una de las preguntas sugeridas a continuación?",
      topicResponse: "Puedo ayudarte con preguntas sobre {topicName}. Por favor, haz una pregunta específica o selecciona una de las preguntas sugeridas a continuación."
    }
  },
  it: {
    greetings: {
      morning: "Buongiorno",
      afternoon: "Buon pomeriggio",
      evening: "Buonasera",
      hello: "Ciao"
    },
    responses: {
      welcome: "Come posso aiutarti oggi?",
      thankYou: "Prego! C'è qualcos'altro in cui posso aiutarti?",
      goodbye: "Arrivederci! Non esitare a chiedere se hai bisogno di aiuto con Nestleo in futuro. Puoi chiudere questa chat o fare una nuova domanda in qualsiasi momento.",
      howAreYou: "Sto bene, grazie per averlo chiesto! Sono qui per aiutarti con qualsiasi domanda su Nestleo. Come posso assisterti oggi?",
      identity: "Sono l'Assistente Nestleo, progettato per aiutarti a navigare e utilizzare la piattaforma Nestleo in modo efficace. Posso rispondere a domande su edifici, richieste, compiti, eventi e altre funzionalità della piattaforma. Come posso aiutarti oggi?",
      joke: "Perché gli scienziati non si fidano degli atomi? Perché inventano tutto! Ora, come posso aiutarti con Nestleo oggi?",
      weather: "Mi dispiace, non ho informazioni meteo in tempo reale. Sono focalizzato sull'aiutarti con la piattaforma Nestleo.",
      love: "È molto gentile! Sono qui per aiutarti con Nestleo. Quali domande hai sulla piattaforma?",
      topicHelp: "Posso aiutarti con domande su {topicName}. Ecco alcuni argomenti comuni di cui le persone chiedono:",
      noPermission: "Mi dispiace, non hai accesso alle informazioni su {topicId} in base al tuo ruolo attuale. Ecco alcune domande con cui posso aiutarti invece:",
      noSpecificAnswer: "Non sono sicuro di capire la tua domanda. Potresti riformularla o selezionare una delle domande suggerite qui sotto?",
      topicResponse: "Posso aiutarti con domande su {topicName}. Per favore, fai una domanda specifica o seleziona una delle domande suggerite qui sotto."
    }
  }
};

const PlatformAssistant = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.Loginn || {});
  const { 
    active: assistantConfig, 
    loading: configLoading, 
    error: configError,
    availableLanguages,
    currentLanguage,
    activeByLanguage
  } = useSelector(state => state.assistantConfig || {});
  useEffect(() => {
  // When language changes, reset the chat
  if (dataLoaded && currentLanguage) {
    console.log(`🔄 Language changed to: ${currentLanguage}, resetting chat...`);
    
    // Use a timeout to ensure the new language data is loaded first
    setTimeout(() => {
      clearChat();
    }, 100);
  }
}, [currentLanguage]); 
  const getUiText = (key) => {
    const lang = currentLanguage || 'en';
    return (uiTranslations[lang] && uiTranslations[lang][key]) || uiTranslations.en[key];
  };

  // Get conversation translations based on current language
  const getConversationText = (category, key, replacements = {}) => {
    const lang = currentLanguage || 'en';
    const translations = conversationTranslations[lang] || conversationTranslations.en;
    
    let text = translations[category] && translations[category][key] 
      ? translations[category][key] 
      : (conversationTranslations.en[category] && conversationTranslations.en[category][key] || '');
    
    // Replace any placeholders
    Object.keys(replacements).forEach(placeholder => {
      text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    
    return text;
  };
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState('general');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Chat history with welcome message
  const [chatHistory, setChatHistory] = useState([]);
  
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Language name mapping (for display purposes)
  const languageNames = {
    'en': 'English',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano',
  };

  // Fetch all active configurations on component mount
  useEffect(() => {
    dispatch(getAllActiveConfigs());
  }, [dispatch]);

  // Initialize chat once config is loaded
  useEffect(() => {
    if (assistantConfig && !dataLoaded) {
      // Set welcome message based on user role
      const welcomeMessage = getWelcomeMessage();
      setChatHistory([
        {
          type: 'assistant',
          message: welcomeMessage,
          timestamp: new Date()
        }
      ]);

      // Set role-specific suggested questions
      if (user?.role) {
        const roleQuestions = assistantConfig.roleSpecificQuestions.find(q => q.role === user.role);
        if (roleQuestions?.questions?.length > 0) {
          setSuggestedQuestions(roleQuestions.questions);
        } else {
          // Fallback to general questions
          const generalTopic = assistantConfig.topics.find(t => t.id === 'general');
          if (generalTopic?.questions) {
            setSuggestedQuestions(generalTopic.questions.map(q => q.question));
          }
        }
      }
      
      setDataLoaded(true);
    }
  }, [assistantConfig, user?.role, dataLoaded]);
  
  // Scroll to bottom when chat history updates
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatHistory, isOpen]);
  
  // Change language handler
  const handleLanguageChange = (lang) => {
    if (lang !== currentLanguage) {
      dispatch(setCurrentLanguage(lang));
      
      // If we don't have this language's config yet, fetch it
      if (!activeByLanguage[lang]) {
        dispatch(getActiveConfig(lang));
      }
      
      // Reset data loaded state to trigger reinitialization
      setDataLoaded(false);
      
      // Reset chat with welcome message in the new language
      setChatHistory([]);
      
      // Reset topic to general
      setActiveTopic('general');
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const toggleAssistant = () => {
    setIsOpen(!isOpen);
    // Focus on input when assistant opens
    setTimeout(() => {
      if (!isOpen) searchInputRef.current?.focus();
    }, 300);
  };
  
  const getWelcomeMessage = () => {
    if (!assistantConfig?.welcomeMessages?.length) {
      // Default welcome message if none found in config
      const greeting = getConversationText('greetings', 'hello');
      const welcome = getConversationText('responses', 'welcome');
      return `${greeting} ${user?.firstName || 'there'}! ${welcome}`;
    }

    // Find welcome message for user role, or use Guest if not found
    const roleMessage = assistantConfig.welcomeMessages.find(
      msg => msg.role === (user?.role || 'Guest')
    );

    if (roleMessage) {
      return roleMessage.message.replace('{firstName}', user?.firstName || 'there');
    }
    
    // Fallback to first welcome message if no role match
    return assistantConfig.welcomeMessages[0].message.replace('{firstName}', user?.firstName || 'there');
  };

  // Helper function to detect conversational queries
  const isConversationalQuery = (query) => {
    const conversationalTerms = {
      en: [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'thanks', 'thank you', 'bye', 'by', 'goodbye', 'see you', 'how are you', 
        'nice to meet you', 'pleased to meet you'
      ],
      fr: [
        'salut', 'bonjour', 'bonsoir', 'bon matin', 'bon après-midi', 'bonsoir',
        'merci', 'je vous remercie', 'au revoir', 'à bientôt', 'à plus tard', 'comment ça va', 
        'enchanté', 'ravi de vous rencontrer'
      ],
      es: [
        'hola', 'buenos días', 'buenas tardes', 'buenas noches',
        'gracias', 'muchas gracias', 'adiós', 'hasta luego', 'hasta pronto',
        'cómo estás', 'qué tal', 'encantado', 'mucho gusto'
      ],
      it: [
        'ciao', 'buongiorno', 'buon pomeriggio', 'buonasera',
        'grazie', 'ti ringrazio', 'arrivederci', 'a presto', 'a dopo',
        'come stai', 'come va', 'piacere', 'lieto di conoscerti'
      ]
    };
    
    query = query.toLowerCase().trim();
    const lang = currentLanguage || 'en';
    const terms = [...(conversationalTerms[lang] || []), ...conversationalTerms.en]; // Always include English as fallback
    
    // Check for exact matches
    if (terms.includes(query)) {
      return true;
    }
    
    // Check for starting with conversational terms
    for (const term of terms) {
      if (query.startsWith(term + ' ')) {
        return true;
      }
    }
    
    return false;
  };

  const suggestFollowUpQuestions = (query) => {
    // After greeting or thank you response, suggest useful questions
    if (isConversationalQuery(query)) {
      // Get role-specific questions if available
      const roleQuestions = assistantConfig?.roleSpecificQuestions.find(
        rq => rq.role === (user?.role || 'Guest')
      );
      
      if (roleQuestions?.questions?.length > 0) {
        return roleQuestions.questions.slice(0, 5);
      } else {
        // Fallback to general topic questions
        const generalTopic = assistantConfig?.topics.find(t => t.id === 'general');
        if (generalTopic?.questions) {
          return generalTopic.questions.slice(0, 5).map(q => q.question);
        }
      }
    }
    
    return null; // Return null if not a conversational query
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!currentMessage.trim() || !assistantConfig) return;
    
    // Add user message to chat
    const userMessage = {
      type: 'user',
      message: currentMessage,
      timestamp: new Date()
    };
    
    // Save current message for follow-up suggestion checking
    const userQuery = currentMessage.trim();
    
    setChatHistory([...chatHistory, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    
    // Detect topic from message
    const detectedTopic = detectTopicFromMessage(userQuery);
    
    // Update active topic if different from current
    if (detectedTopic !== activeTopic) {
      setActiveTopic(detectedTopic);
    }
    
    // Get intelligent response
    setTimeout(() => {
      const response = getAssistantResponse(userQuery);
      
      const assistantMessage = {
        type: 'assistant',
        message: response,
        timestamp: new Date()
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      
      // Check if we should update suggested questions based on conversation type
      const followUpSuggestions = suggestFollowUpQuestions(userQuery);
      
      if (followUpSuggestions) {
        // For conversational queries, use follow-up suggestions
        setSuggestedQuestions(followUpSuggestions);
      } else {
        // For regular queries, update based on detected topic
        updateSuggestedQuestions(detectedTopic);
      }
    }, 1000);
  };
  
  const detectTopicFromMessage = (message) => {
    if (!assistantConfig) return 'general';
    
    message = message.toLowerCase();
    
    // Skip topic detection for conversational messages
    if (isConversationalQuery(message)) {
      return activeTopic; // Keep current topic for conversational queries
    }
    
    // Get user's allowed topics based on role permissions
    const userRole = user?.role || 'Guest';
    const userRolePermissions = assistantConfig.rolePermissions.find(rp => rp.role === userRole);
    const allowedTopics = userRolePermissions?.allowedTopics || ['general'];
    
    // Check each topic ID if it's mentioned in the message
    for (const topic of assistantConfig.topics) {
      if (allowedTopics.includes(topic.id) && message.includes(topic.id.toLowerCase())) {
        return topic.id;
      }
    }
    
    // Check each keyword in the message
    for (const keyword of assistantConfig.keywords) {
      if (message.includes(keyword.keyword.toLowerCase())) {
        // For keywords, we don't return a topic but will use the answer directly
        // So we still need to find a suitable topic to return
        const relatedTopic = findRelatedTopic(keyword.keyword);
        if (relatedTopic && allowedTopics.includes(relatedTopic)) {
          return relatedTopic;
        }
      }
    }
    
    return allowedTopics.includes('general') ? 'general' : allowedTopics[0];
  };
  
  // Helper function to find a related topic for a keyword
  const findRelatedTopic = (keyword) => {
    if (!assistantConfig?.topics) return 'general';

    // Map of common keywords to topics
    const keywordTopicMap = {
      'building': 'buildings',
      'apartment': 'buildings',
      'property': 'buildings',
      'claim': 'claims',
      'issue': 'claims',
      'task': 'tasks',
      'event': 'events',
      'meeting': 'events',
      'chat': 'chat',
      'message': 'chat',
      'subscription': 'subscriptions',
      'payment': 'billing',
      'bill': 'billing',
      'document': 'documents',
      'file': 'documents',
      // French keywords
      'immeuble': 'buildings',
      'appartement': 'buildings',
      'propriété': 'buildings',
      'réclamation': 'claims',
      'problème': 'claims',
      'tâche': 'tasks',
      'événement': 'events',
      'réunion': 'events',
      'discussion': 'chat',
      'message': 'chat',
      'abonnement': 'subscriptions',
      'paiement': 'billing',
      'facture': 'billing',
      'document': 'documents',
      'fichier': 'documents',
      // Spanish keywords
      'edificio': 'buildings',
      'apartamento': 'buildings',
      'propiedad': 'buildings',
      'reclamo': 'claims',
      'problema': 'claims',
      'tarea': 'tasks',
      'evento': 'events',
      'reunión': 'events',
      'chat': 'chat',
      'mensaje': 'chat',
      'suscripción': 'subscriptions',
      'pago': 'billing',
      'factura': 'billing',
      'documento': 'documents',
      'archivo': 'documents',
      // Italian keywords
      'edificio': 'buildings',
      'appartamento': 'buildings',
      'proprietà': 'buildings',
      'reclamo': 'claims',
      'problema': 'claims',
      'compito': 'tasks',
      'attività': 'tasks',
      'evento': 'events',
      'riunione': 'events',
      'chat': 'chat',
      'messaggio': 'chat',
      'abbonamento': 'subscriptions',
      'pagamento': 'billing',
      'fattura': 'billing',
      'documento': 'documents',
      'file': 'documents'
    };

    keyword = keyword.toLowerCase();
    
    // Check if any word in the keyword directly maps to a topic
    const words = keyword.split(/\s+/);
    for (const word of words) {
      if (keywordTopicMap[word]) {
        return keywordTopicMap[word];
      }
    }
    
    return 'general';
  };
  
  const getAssistantResponse = (query) => {
  if (!assistantConfig) {
    return "I'm sorry, I'm still loading my knowledge base. Please try again in a moment.";
  }
  
  query = query.toLowerCase().trim();
  
  // Handle common greetings
  const greetings = {
    en: {
      hi: true,
      hello: true,
      hey: true,
      'good morning': true,
      'good afternoon': true,
      'good evening': true,
      'morning': true,
      'afternoon': true,
      'evening': true,
      'greetings': true
    },
    fr: {
      'salut': true,
      'bonjour': true,
      'bonsoir': true,
      'bon matin': true,
      'bon après-midi': true,
      'bonsoir': true,
      'matin': true,
      'après-midi': true,
      'soir': true,
      'salutations': true
    },
    es: {
      'hola': true,
      'buenos días': true,
      'buenas tardes': true,
      'buenas noches': true,
      'día': true,
      'tarde': true,
      'noche': true,
      'saludos': true
    },
    it: {
      'ciao': true,
      'buongiorno': true,
      'buon pomeriggio': true,
      'buonasera': true,
      'giorno': true,
      'pomeriggio': true,
      'sera': true,
      'salve': true
    }
  };
  
  // Handle thank you messages
  const thankYouTerms = {
    en: {
      'thank you': true,
      'thanks': true,
      'appreciate it': true,
      'thank': true,
      'thx': true,
      'ty': true
    },
    fr: {
      'merci': true,
      'je vous remercie': true,
      'je te remercie': true,
      'merci beaucoup': true
    },
    es: {
      'gracias': true,
      'muchas gracias': true,
      'te agradezco': true,
      'le agradezco': true,
      'agradecido': true
    },
    it: {
      'grazie': true,
      'ti ringrazio': true,
      'la ringrazio': true,
      'grazie mille': true,
      'molto gentile': true
    }
  };
  
  // Handle goodbyes
  const goodbyeTerms = {
    en: {
      'bye': true,
      'goodbye': true,
      'see you': true,
      'talk to you later': true,
      'cya': true,
      'good night': true,
      'have a good day': true,
      'later': true
    },
    fr: {
      'au revoir': true,
      'à bientôt': true,
      'à plus tard': true,
      'à la prochaine': true,
      'salut': true,
      'bonne nuit': true,
      'bonne journée': true,
      'à plus': true
    },
    es: {
      'adiós': true,
      'hasta luego': true,
      'hasta pronto': true,
      'nos vemos': true,
      'chao': true,
      'buenas noches': true,
      'que tengas un buen día': true,
      'hasta la próxima': true
    },
    it: {
      'arrivederci': true,
      'a presto': true,
      'a dopo': true,
      'ci vediamo': true,
      'ciao': true,
      'buonanotte': true,
      'buona giornata': true,
      'alla prossima': true
    }
  };
  
  const lang = currentLanguage || 'en';
  
  // Get user's role for permission checking
  const userRole = user?.role || 'Guest';
  
  // Check for exact greetings
  if ((greetings[lang] && greetings[lang][query]) || (greetings.en && greetings.en[query])) {
    const timeOfDay = new Date().getHours();
    let greeting;
    
    if (timeOfDay < 12) {
      greeting = getConversationText('greetings', 'morning');
    } else if (timeOfDay < 18) {
      greeting = getConversationText('greetings', 'afternoon');
    } else {
      greeting = getConversationText('greetings', 'evening');
    }
    
    const welcome = getConversationText('responses', 'welcome');
    return `${greeting}, ${user?.firstName || 'there'}! ${welcome}`;
  }
  
  // Check for greetings with additional text
  for (const greetingLang of [lang, 'en']) {
    for (const greeting in (greetings[greetingLang] || {})) {
      if (query.startsWith(greeting + " ") || query.includes(" " + greeting + " ")) {
        const hello = getConversationText('greetings', 'hello');
        const welcome = getConversationText('responses', 'welcome');
        return `${hello}! ${welcome}`;
      }
    }
  }
  
  // Check for thank you messages
  for (const thankLang of [lang, 'en']) {
    for (const thankTerm in (thankYouTerms[thankLang] || {})) {
      if (query === thankTerm || query.includes(thankTerm)) {
        return getConversationText('responses', 'thankYou');
      }
    }
  }
  
  // Check for goodbyes
  for (const byeLang of [lang, 'en']) {
    for (const byeTerm in (goodbyeTerms[byeLang] || {})) {
      if (query === byeTerm || query.includes(byeTerm)) {
        return getConversationText('responses', 'goodbye');
      }
    }
  }
  
  // Check for how are you and similar questions
  if (
    query.includes("how are you") || 
    query === "how's it going" || 
    query === "how are things" || 
    query === "what's up" ||
    // French versions
    query.includes("comment ça va") ||
    query === "comment allez-vous" ||
    query === "ça va" ||
    query === "comment vas-tu" ||
    // Spanish versions
    query.includes("cómo estás") ||
    query === "cómo te va" ||
    query === "qué tal" ||
    query === "cómo van las cosas" ||
    // Italian versions
    query.includes("come stai") ||
    query === "come va" ||
    query === "tutto bene" ||
    query === "come vanno le cose"
  ) {
    return getConversationText('responses', 'howAreYou');
  }
  
  // Check for questions about the assistant's identity
  if (
    query.includes("who are you") || 
    query.includes("your name") || 
    query.includes("what are you") ||
    // French versions
    query.includes("qui es-tu") || 
    query.includes("qui êtes-vous") ||
    query.includes("ton nom") ||
    query.includes("votre nom") ||
    query.includes("qu'es-tu") ||
    query.includes("qu'êtes-vous") ||
    // Spanish versions
    query.includes("quién eres") ||
    query.includes("cómo te llamas") ||
    query.includes("qué eres") ||
    query.includes("tu nombre") ||
    // Italian versions
    query.includes("chi sei") || 
    query.includes("come ti chiami") ||
    query.includes("che cosa sei") ||
    query.includes("il tuo nome")
  ) {
    return getConversationText('responses', 'identity');
  }
  
  // First check all topics for exact question matches with permission checking
  for (const topic of assistantConfig.topics) {
    for (const qa of topic.questions) {
      if (qa.question.toLowerCase() === query || 
          qa.question.toLowerCase().replace(/[?.,!]/g, '').trim() === query.replace(/[?.,!]/g, '').trim()) {
        
        // Check if this specific question has role restrictions
        if (qa.allowedRoles && qa.allowedRoles.length > 0) {
          // If the question has specific role permissions and user doesn't have access
          if (!qa.allowedRoles.includes(userRole)) {
            return getConversationText('responses', 'noPermission', { 
              topicId: topic.name || topic.id 
            });
          }
        }
        
        // Check if the entire topic has role restrictions
        if (topic.allowedRoles && topic.allowedRoles.length > 0) {
          // If topic has specific role permissions and user doesn't have access
          if (!topic.allowedRoles.includes(userRole)) {
            return getConversationText('responses', 'noPermission', { 
              topicId: topic.name || topic.id 
            });
          }
        }
        
        // Check permissions in role permissions configuration
        const rolePermission = assistantConfig.rolePermissions.find(rp => rp.role === userRole);
        if (rolePermission && rolePermission.allowedTopics && 
            rolePermission.allowedTopics.length > 0 && 
            !rolePermission.allowedTopics.includes(topic.id)) {
          return getConversationText('responses', 'noPermission', { 
            topicId: topic.name || topic.id 
          });
        }
        
        // If we reach here, the user has permission to see this answer
        return qa.answer;
      }
    }
  }
  
  // Then check for keyword matches with permission checks
  for (const keywordItem of assistantConfig.keywords) {
    if (query.includes(keywordItem.keyword.toLowerCase())) {
      // Check if this keyword has role restrictions
      if (keywordItem.allowedRoles && keywordItem.allowedRoles.length > 0) {
        // If the keyword has specific role permissions and user doesn't have access
        if (!keywordItem.allowedRoles.includes(userRole)) {
          return getConversationText('responses', 'noPermission', { 
            topicId: keywordItem.keyword
          });
        }
      }
      
      return keywordItem.answer;
    }
  }
  
  // Handle small talk
  if (
    query.includes("weather") || 
    query.includes("météo") ||
    query.includes("climat") ||
    query.includes("tiempo") ||
    query.includes("clima") ||
    query.includes("meteo") ||
    query.includes("tempo")
  ) {
    return getConversationText('responses', 'weather');
  }
  
  if (
    query.includes("joke") || 
    query.includes("funny") ||
    query.includes("blague") ||
    query.includes("drôle") ||
    query.includes("amusant") ||
    query.includes("chiste") ||
    query.includes("broma") ||
    query.includes("gracioso") ||
    query.includes("barzelletta") ||
    query.includes("battuta") ||
    query.includes("divertente") 
  ) {
    return getConversationText('responses', 'joke');
  }
  
  if (
    query.includes("love you") || 
    query === "i love you" ||
    query.includes("je t'aime") ||
    query === "je vous aime" ||
    query.includes("te quiero") ||
    query === "te amo" ||
    query.includes("ti amo") ||
    query === "ti voglio bene"
  ) {
    return getConversationText('responses', 'love');
  }
  
  // Detect topic from query to check topic-level permissions
  const topicWords = findTopicWordsInQuery(query);
  if (topicWords.length > 0) {
    const detectedTopicId = topicWords[0]; // Use the first detected topic
    const detectedTopic = assistantConfig.topics.find(t => t.id === detectedTopicId);
    
    if (detectedTopic) {
      // Check if user has permission for this topic
      const rolePermission = assistantConfig.rolePermissions.find(rp => rp.role === userRole);
      const hasTopicPermission = !rolePermission || 
                               !rolePermission.allowedTopics || 
                               rolePermission.allowedTopics.length === 0 ||
                               rolePermission.allowedTopics.includes(detectedTopicId);
      
      const hasTopicRolePermission = !detectedTopic.allowedRoles || 
                                   detectedTopic.allowedRoles.length === 0 || 
                                   detectedTopic.allowedRoles.includes(userRole);
      
      if (!hasTopicPermission || !hasTopicRolePermission) {
        return getConversationText('responses', 'noPermission', { 
          topicId: detectedTopic.name || detectedTopic.id 
        });
      }
      
      // Return generic topic response
      return getConversationText('responses', 'topicResponse', { 
        topicName: detectedTopic.name || detectedTopic.id 
      });
    }
  }
  
  // Default generic response
  return getConversationText('responses', 'noSpecificAnswer');
};
  
  const findTopicWordsInQuery = (query) => {
    if (!assistantConfig?.topics) return [];
    
    const topics = [];
    
    // Direct topic ID matches
    for (const topic of assistantConfig.topics) {
      if (query.includes(topic.id.toLowerCase())) {
        topics.push(topic.id);
      }
    }
    
    // Common topic keywords
    const topicKeywords = {
      'buildings': [
        'building', 'apartment', 'property', 'bloc', 'unit', 
        'immeuble', 'appartement', 'propriété', 'bloc', 'unité',
        'edificio', 'apartamento', 'propiedad', 'bloque', 'unidad',
        'edificio', 'appartamento', 'proprietà', 'immobile', 'unità'
      ],
      'claims': [
        'claim', 'issue', 'problem', 'request', 'complaint', 
        'réclamation', 'problème', 'requête', 'demande', 'plainte',
        'reclamo', 'problema', 'solicitud', 'queja', 'demanda',
        'reclamo', 'problema', 'richiesta', 'lamentela', 'segnalazione'
      ],
      'tasks': [
        'task', 'assign', 'todo', 'job', 'work', 
        'tâche', 'assigner', 'à faire', 'travail',
        'tarea', 'asignar', 'trabajo', 'hacer',
        'compito', 'attività', 'incarico', 'lavoro', 'da fare'
      ],
      'events': [
        'event', 'meeting', 'calendar', 'schedule', 'appointment', 
        'événement', 'réunion', 'calendrier', 'horaire', 'rendez-vous',
        'evento', 'reunión', 'calendario', 'horario', 'cita',
        'evento', 'riunione', 'calendario', 'programma', 'appuntamento'
      ],
      'chat': [
        'chat', 'message', 'communication', 'talk', 'conversation', 
        'discussion', 'message', 'communication', 'parler', 'conversation',
        'chat', 'mensaje', 'comunicación', 'hablar', 'conversación',
        'chat', 'messaggio', 'comunicazione', 'parlare', 'conversazione'
      ],
      'subscriptions': [
        'subscription', 'plan', 'price', 'cost', 
        'abonnement', 'forfait', 'prix', 'coût',
        'suscripción', 'plan', 'precio', 'costo',
        'abbonamento', 'piano', 'prezzo', 'costo'
      ],
      'roles': [
        'role', 'permission', 'access', 'right', 'privilege', 
        'rôle', 'permission', 'accès', 'droit', 'privilège',
        'rol', 'permiso', 'acceso', 'derecho', 'privilegio',
        'ruolo', 'permesso', 'accesso', 'diritto', 'privilegio'
      ],
      'notifications': [
        'notification', 'alert', 'remind', 'notify', 'announcement', 
        'notification', 'alerte', 'rappel', 'avertissement', 'annonce',
        'notificación', 'alerta', 'recordatorio', 'aviso', 'anuncio',
        'notifica', 'avviso', 'promemoria', 'avvertimento', 'annuncio'
      ],
      'documents': [
        'document', 'file', 'upload', 'paper', 'form', 
        'document', 'fichier', 'téléchargement', 'papier', 'formulaire',
        'documento', 'archivo', 'subir', 'papel', 'formulario',
        'documento', 'file', 'caricamento', 'carta', 'modulo'
      ],
      'billing': [
        'bill', 'invoice', 'fee', 'payment', 'charge', 
        'facture', 'reçu', 'frais', 'paiement', 'coût',
        'factura', 'cobro', 'pago', 'cargo', 'cuota',
        'fattura', 'ricevuta', 'costo', 'pagamento', 'addebito'
      ]
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (assistantConfig.topics.some(t => t.id === topic)) {
        for (const keyword of keywords) {
          if (query.includes(keyword)) {
            topics.push(topic);
            break;
          }
        }
      }
    }
    
    return topics;
  };
  
  const handleQuickQuestion = (question) => {
    if (!assistantConfig) return;
    
    const userMessage = {
      type: 'user',
      message: question,
      timestamp: new Date()
    };
    
    setChatHistory([...chatHistory, userMessage]);
    setIsLoading(true);
    
    setTimeout(() => {
      // Find the exact answer for this question
      let answer = null;
      
      // Search in topics for exact question match
      for (const topic of assistantConfig.topics) {
        for (const qa of topic.questions) {
          if (qa.question === question) {
            answer = qa.answer;
            break;
          }
        }
        if (answer) break;
      }
      
      // If no answer found, provide a generic response
      if (!answer) {
        answer = getConversationText('responses', 'noSpecificAnswer');
      }
      
      const assistantMessage = {
        type: 'assistant',
        message: answer,
        timestamp: new Date()
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };
  
  const setTopic = (topicId) => {
    if (!assistantConfig) return;
    
    // Check if user has permission to access this topic
    const userRole = user?.role || 'Guest';
    const rolePermissions = assistantConfig.rolePermissions.find(rp => rp.role === userRole);
    const allowedTopics = rolePermissions?.allowedTopics || ['general'];
    
    if (!allowedTopics.includes(topicId)) {
      // If user doesn't have permission, show a message and fall back to general
      const assistantMessage = {
        type: 'assistant',
        message: getConversationText('responses', 'noPermission', { topicId }),
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
      
      // Fall back to first allowed topic
      topicId = allowedTopics[0] || 'general';
    }
    
    setActiveTopic(topicId);
    updateSuggestedQuestions(topicId);
    
    // Add a helpful message when topic changes
    const topic = assistantConfig.topics.find(t => t.id === topicId);
    const topicName = topic?.name || getUiText('generalHelp');
    
    const assistantMessage = {
      type: 'assistant',
      message: getConversationText('responses', 'topicHelp', { topicName }),
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, assistantMessage]);
  };
  
  const updateSuggestedQuestions = (topicId) => {
    if (!assistantConfig) return;
    
    const topic = assistantConfig.topics.find(t => t.id === topicId);
    
    if (topic?.questions?.length > 0) {
      // Get questions from this topic
      setSuggestedQuestions(topic.questions.map(q => q.question));
    } else {
      // Fall back to role-specific questions
      const roleQuestions = assistantConfig.roleSpecificQuestions.find(
        rq => rq.role === (user?.role || 'Guest')
      );
      
      if (roleQuestions?.questions?.length > 0) {
        setSuggestedQuestions(roleQuestions.questions);
      } else {
        // Ultimate fallback to general questions
        const generalTopic = assistantConfig.topics.find(t => t.id === 'general');
        if (generalTopic?.questions) {
          setSuggestedQuestions(generalTopic.questions.map(q => q.question));
        } else {
          setSuggestedQuestions([]);
        }
      }
    }
  };
  
  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    
    // Only update suggestions if enough text for meaningful matches and config is loaded
    if (e.target.value.length > 2 && assistantConfig) {
      updateSmartSuggestions(e.target.value);
    }
  };
  
  const updateSmartSuggestions = (query) => {
    if (!assistantConfig) return;
    
    query = query.toLowerCase();
    
    // Skip changing suggestions for basic conversational queries
    if (isConversationalQuery(query)) {
      return;
    }
    
    // Get user's allowed topics
    const userRole = user?.role || 'Guest';
    const rolePermissions = assistantConfig.rolePermissions.find(rp => rp.role === userRole);
    const allowedTopics = rolePermissions?.allowedTopics || ['general'];
    
    // First check if query directly matches any keyword
    for (const keywordItem of assistantConfig.keywords) {
      if (query.includes(keywordItem.keyword.toLowerCase())) {
        // Find related questions from topics
        const relatedTopic = findRelatedTopic(keywordItem.keyword);
        
        if (relatedTopic && allowedTopics.includes(relatedTopic)) {
          const topic = assistantConfig.topics.find(t => t.id === relatedTopic);
          if (topic?.questions?.length > 0) {
            setSuggestedQuestions(topic.questions.map(q => q.question));
            return;
          }
        }
      }
    }
    
    // Then check for partial matches in questions across allowed topics
    const matchingQuestions = [];
    
    for (const topic of assistantConfig.topics) {
      if (!allowedTopics.includes(topic.id)) continue;
      
      for (const qa of topic.questions) {
        if (qa.question.toLowerCase().includes(query)) {
          matchingQuestions.push(qa.question);
        }
      }
    }
    
    if (matchingQuestions.length > 0) {
      setSuggestedQuestions(matchingQuestions.slice(0, 5));
      return;
    }
    
    // Fall back to role-specific questions
    const roleQuestions = assistantConfig.roleSpecificQuestions.find(
      rq => rq.role === userRole
    );
    
    if (roleQuestions?.questions?.length > 0) {
      setSuggestedQuestions(roleQuestions.questions.slice(0, 5));
    }
  };
  
  const clearChat = () => {
    setChatHistory([
      {
        type: 'assistant',
        message: getWelcomeMessage(),
        timestamp: new Date()
      }
    ]);
    
    // Reset to general topic
    setActiveTopic('general');
    
    // Show role-specific questions after clearing
    const roleQuestions = assistantConfig?.roleSpecificQuestions.find(
      rq => rq.role === (user?.role || 'Guest')
    );
    
    if (roleQuestions?.questions?.length > 0) {
      setSuggestedQuestions(roleQuestions.questions);
    } else {
      // Fallback to general topic questions
      const generalTopic = assistantConfig?.topics.find(t => t.id === 'general');
      if (generalTopic?.questions) {
        setSuggestedQuestions(generalTopic.questions.map(q => q.question));
      } else {
        setSuggestedQuestions([]);
      }
    }
  };

  // Filter topics based on user role permissions
  const getFilteredTopics = () => {
    if (!assistantConfig?.topics) return [];
    
    const userRole = user?.role || 'Guest';
    const rolePermission = assistantConfig.rolePermissions.find(rp => rp.role === userRole);
    const allowedTopics = rolePermission?.allowedTopics || ['general'];
    
    return assistantConfig.topics.filter(topic => 
      allowedTopics.includes(topic.id)
    );
  };
  
  // Show loading state while configuration loads
  if (configLoading && !assistantConfig) {
    return (
      <div className="platform-assistant-container">
        <Button 
          color="primary" 
          className="platform-assistant-button disabled"
        >
          <Spinner size="sm" /> {getUiText('loading')}
        </Button>
      </div>
    );
  }
  
  // Show error state if config loading failed
  if (configError && !assistantConfig) {
    return (
      <div className="platform-assistant-container">
        <Button 
          color="danger" 
          className="platform-assistant-button"
          onClick={() => dispatch(getActiveConfig(currentLanguage))}
        >
          <FeatherIcon icon="alert-circle" size={16} className="me-1" />
          {getUiText('retry')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="platform-assistant-container">
      {/* Floating button to open assistant */}
     <Button
     color='navbar'
  className="platform-assistant-button circular" 
  onClick={toggleAssistant}
>
  {isOpen ? (
    <FeatherIcon icon="chevron-down" size={24} />
  ) : (
    <img 
      src={assistant} 
      alt="Assistant" 
      style={{ width: '28px', height: '28px', filter: 'brightness(0) invert(1)' }} 
    />
  )}
</Button>
      {/* Assistant chat window */}
      {isOpen && (
        <Card className="platform-assistant-card">
          <div className="platform-assistant-header">
            <div className="d-flex align-items-center">
              <div className="platform-assistant-avatar me-2">
                  <img 
                  src={assistant} 
                  alt="Assistant" 
                  style={{ width: '24px', height: '24px' }} 
                  />
              </div>
              <div>
                <h5 className="mb-0">{getUiText('assistantTitle')}</h5>
                <small>
                  {user?.role ? 
                    `${getUiText('personalizedFor')} ${user.role}` : 
                    getUiText('intelligentHelper')}
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center">
              <Button 
                color="link"
                className="platform-assistant-clear me-2" 
                onClick={clearChat}
                title={getUiText('clearConversation')}
              >
                <FeatherIcon icon="trash-2" size={16} />
              </Button>
              <Button 
                color="link"
                className="platform-assistant-close" 
                onClick={toggleAssistant}
              >
                <FeatherIcon icon="x" size={18} />
              </Button>
            </div>
          </div>
          
          <div className="platform-assistant-layout">
            {/* Side topics menu for larger screens */}
            <div className="platform-assistant-topics-sidebar">
              <div className="topics-header">
                <h6 className="mb-2">{getUiText('topics')}</h6>
              </div>
              <div className="topics-menu">
                {getFilteredTopics().map(topic => (
                  <div
                    key={topic.id}
                    className={`topic-item ${activeTopic === topic.id ? 'active' : ''}`}
                    onClick={() => setTopic(topic.id)}
                  >
                    <FeatherIcon icon={topic.icon} size={14} className="me-2" />
                    <span>{topic.name}</span>
                  </div>
                ))}
              </div>
            </div>
          
            <div className="platform-assistant-content">
              {/* Topics carousel for mobile screens */}
              <div className="platform-assistant-topics-carousel d-lg-none">
                <div className="d-flex flex-nowrap overflow-auto pb-2">
                  {getFilteredTopics().map(topic => (
                    <Button
                      key={topic.id}
                      color={activeTopic === topic.id ? "primary" : "light"}
                      className="platform-assistant-topic-btn me-2 mb-2 d-flex align-items-center"
                      onClick={() => setTopic(topic.id)}
                      title={topic.name}
                    >
                      <FeatherIcon icon={topic.icon} size={14} className="me-1" />
                      <span className="topic-name">{topic.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {configError && (
                <Alert color="warning" className="mb-3">
                  There was a problem loading the latest assistant data. Some information might be outdated.
                </Alert>
              )}
              
              <div className="platform-assistant-messages" ref={chatContainerRef}>
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`platform-assistant-message ${msg.type === 'user' ? 'user-message' : 'assistant-message'}`}
                  >
                    {msg.type === 'assistant' && (
                      <div className="platform-assistant-avatar">
                        <FeatherIcon icon="message-square" size={16} />
                      </div>
                    )}
                    <div className="platform-assistant-message-content">
                      <div className="platform-assistant-message-text">
                        {msg.message}
                      </div>
                      <div className="platform-assistant-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="platform-assistant-message assistant-message">
                    <div className="platform-assistant-avatar">
                      <FeatherIcon icon="message-square" size={16} />
                    </div>
                    <div className="platform-assistant-message-content">
                      <div className="platform-assistant-message-text typing-indicator">
                        <Spinner size="sm" color="primary" />
                        <span className="ms-2">{getUiText('thinking')}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="platform-assistant-suggested-questions">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">{getUiText('suggestedQuestions')}</h6>
                  <Badge color="light" pill className="text-muted">
                    {activeTopic === 'general' ? getUiText('generalHelp') : assistantConfig?.topics.find(t => t.id === activeTopic)?.name || activeTopic}
                  </Badge>
                </div>
                <div className="d-flex flex-wrap">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      color="light"
                      size="sm"
                      className="platform-assistant-question-btn me-2 mb-2"
                      onClick={() => handleQuickQuestion(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
              
              <form onSubmit={handleSendMessage} className="platform-assistant-input">
                <InputGroup>
                  <Input
                    type="text"
                    placeholder={getUiText('askQuestion')}
                    value={currentMessage}
                    onChange={handleInputChange}
                    disabled={isLoading || !assistantConfig}
                    innerRef={searchInputRef}
                  />
                  <Button 
                    color="primary" 
                    disabled={isLoading || !currentMessage.trim() || !assistantConfig}
                  >
                    <FeatherIcon icon="send" size={16} />
                  </Button>
                </InputGroup>
              </form>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformAssistant;