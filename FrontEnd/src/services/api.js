import axios from "axios";
import { jwtDecode } from "jwt-decode"; // ✅ Use named import
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
   headers: { 'Content-Type': 'application/json' },
  // timeout: 15000
});

if (process.env.NODE_ENV !== 'production') {
  api.interceptors.request.use(req => {
    console.log('[api] request:', req.method, req.baseURL + req.url);
    return req;
  });
  api.interceptors.response.use(r => r, e => { console.error('[api] response error:', e.message); return Promise.reject(e); });
}


// Add request interceptor to inject token
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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



export default api;