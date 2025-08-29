import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../slices/login/loginSlice';
import { toast } from 'react-toastify';

const AutoLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isUserLoggedIn } = useSelector(state => state.Loginn);
  
  // Temps d'inactivité - changez ceci à 2 heures pour la production
   const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
  //const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute (pour test)
  
  // Utiliser useRef au lieu de useState pour éviter les re-rendus
  const inactivityTimerRef = useRef(null);
  
  // Ref pour suivre si la déconnexion a déjà été effectuée
  const hasLoggedOutRef = useRef(false);
  
  // Fonction pour réinitialiser le délai d'inactivité
  const resetInactivityTimer = () => {
    // Ne rien faire si l'utilisateur est déjà déconnecté
    if (hasLoggedOutRef.current || !isUserLoggedIn) {
      return;
    }
    
    // Effacer le minuteur précédent s'il existe
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Définir un nouveau minuteur
    inactivityTimerRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  };
  
  // Fonction pour gérer la déconnexion
  const handleLogout = () => {
    // Vérifier si déjà déconnecté pour éviter les actions multiples
    if (hasLoggedOutRef.current || !isUserLoggedIn) {
      return;
    }
    
    // Marquer comme déconnecté
    hasLoggedOutRef.current = true;
    
    // Afficher une seule notification
    toast.info("Vous avez été déconnecté après une période d'inactivité", {
      position: "top-center",
      autoClose: 5000,
      toastId: "auto-logout-toast", // ID unique pour éviter les doublons
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    
    // Déconnexion et redirection
    dispatch(logout());
    navigate('/landing');
  };
  
  // Configurer les écouteurs d'événements lors du montage initial
  useEffect(() => {
    // Réinitialiser l'état de déconnexion lorsque l'état de connexion change
    hasLoggedOutRef.current = false;
    
    if (!isUserLoggedIn) {
      // Ne pas configurer d'écouteurs si l'utilisateur n'est pas connecté
      return;
    }
    
    // Liste des événements à surveiller pour détecter l'activité
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart',
      'click', 'keydown', 'wheel'
    ];
    
    // Fonction pour réinitialiser le minuteur lors de l'activité
    const handleUserActivity = () => {
      resetInactivityTimer();
    };
    
    // Ajouter les écouteurs pour tous les événements
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    // Initialiser le minuteur
    resetInactivityTimer();
    
    // Nettoyer lors du démontage du composant
    return () => {
      // Supprimer tous les écouteurs d'événements
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      // Effacer le minuteur
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isUserLoggedIn]); // Exécuter uniquement lorsque l'état de connexion change
  
  // Ce composant ne rend rien dans le DOM
  return null;
};

export default AutoLogout;