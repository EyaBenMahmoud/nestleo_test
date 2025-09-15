import axios from "axios";
// import jwtDecode from "jwt-decode"; // default import

import { jwtDecode } from "jwt-decode"; // ✅ Use named import
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use(config => {
  if (!config.headers) config.headers = {};
  // Respect any explicitly provided Authorization header (case-insensitive)
  if (!config.headers.Authorization && !config.headers.authorization) {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});






export const setAuthorization = (token) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  const token = localStorage.getItem("token");
  return token
};


export const getUser = (token = null) => {
  // If no token is passed, try getting it from storage
  const userToken = token || getToken();

  if (!userToken) {
    // If there's no token, return null or handle this case as needed
    return null;
  }

  try {
    // Decode the token to get the user data
    const userDecoded = jwtDecode(userToken);


    localStorage.setItem("user", JSON.stringify(userDecoded));

    return userDecoded;
  } catch (error) {
    // Handle invalid token errors (if needed)
    console.error("Error decoding token:", error);
    return null;
  }
};

export const fetchUserProfile = async (token = null) => {
  try {
    const token = getToken() || token;
    if (!token) {
      return null;
    }

    const response = await api.get('/auth/redirectProfile');
        console.log('User profile fetched successfully:', response.data);

    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;   
  }
};

export const transferSyndicAccount = async (newEmail, password) => {
  try {
    const response = await api.post('/users/transfer-syndic-account', {
      newEmail,
      password
    });
    return response.data;
  } catch (error) {
    console.error('Error transferring syndic account:', error);
    throw error.response?.data || error.message;
  }
};

export const finalizeTransfer = async () => {
  try {
    const response = await api.post('/users/transfer-syndic-account/finalize');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const cancelTransfer = async () => {
  try {
    const response = await api.post('/users/transfer-syndic-account/cancel');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getConnectedUser = async () => {
  try {
    const response = await api.get('/users/getConnectedUser');
    return response.data;
  } catch (error) {
    console.error('Error fetching connected user:', error);
    throw error.response?.data || error.message;
  }
};


export const verifyLoginTwoFa = async (tempToken, code) => {
  const res = await api.post('/auth/login/2fa/verify', { code }, {
    headers: { 'x-temp-token': tempToken }
  });
  return res.data;
};

// interceptor attaches token automatically (ok)

// --- Two-factor helpers (use axios api, not fetch) ---
export const enableTwoFaDirect = async () => {
  try {
    // Axios instance will include Authorization header via interceptor
    const response = await api.post('/auth/2fa/enable-direct');
    return response.data;
  } catch (error) {
    console.error('Error enabling 2FA (direct):', error);
    // normalize throw like other helpers
    throw error.response?.data || error.message || 'Enable 2FA failed';
  }
};

export const sendTwoFaCode = async (tempToken) => {
  const res = await api.post('/auth/send-2fa-code', {}, {
    headers: { 'x-temp-token': tempToken }
  });
  return res.data;
};

export const verifyTwoFaCode = async (code, extra = {}) => {
  try {
    const payload = { code, ...extra };
    const response = await api.post('/auth/verify-2fa-code', payload);
    return response.data;
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    throw error.response?.data || error.message;
  }
};

export const disableTwoFa = async (payload = {}) => {
  try {
    const response = await api.post('/auth/2fa/disable', payload);
    return response.data;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw error.response?.data || error.message;
  }
};

// services/api.js (or where acceptPolicies is defined)
export const acceptPolicies = async (tempToken, body = {}) => {
  if (!tempToken) throw new Error('Missing temp token');

  const res = await api.post('/auth/accept-policies', body, {
    headers: {
      'x-temp-token': tempToken,
      Authorization: `Bearer ${tempToken}`,
    },
  });
  return res.data;
};


export default api;