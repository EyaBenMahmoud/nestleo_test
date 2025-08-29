import React, { useEffect } from 'react';

//import Scss
import './assets/scss/themes.scss';
import { useSelector } from 'react-redux';

//imoprt Route
import Route from './Routes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ToastNotification from './Components/Common/toastNotificationComponent';

import PlatformAssistant from '../src/Components/PlatformAssistant/PlatformAssistant';
import AutoLogout from './Components/Auth/autoLogout';
import { disconnectSocket, initializeSocket } from './services/socketManager';

function SocketProvider({ children }) {
  const { isLoggedIn, user } = useSelector(state => state.Loginn);

  useEffect(() => {
    if (isLoggedIn && user) {
      initializeSocket();

      return () => {
        disconnectSocket();
      };
    }else if (!isLoggedIn && !user) {
      disconnectSocket();
    }
  }, [isLoggedIn, user]);

  return children;
}


function App() {
  return (

    <React.Fragment>
            <SocketProvider>

      <ToastContainer />
      <ToastNotification />
      <AutoLogout /> 
      <Route />
      <PlatformAssistant />
            </SocketProvider>

    </React.Fragment>

  );
}

export default App;
