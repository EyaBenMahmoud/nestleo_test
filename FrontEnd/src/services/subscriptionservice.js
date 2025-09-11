import axios from 'axios';

// Direct API URL (replace with your production URL when needed)
const API_URL = `${process.env.REACT_APP_API_URL}/api/subscriptions`;

export const getSubscriptions = () => axios.get(API_URL);
export const getSubscriptionsfront = (language = 'en') => 
  axios.get(`${API_URL}/subscriptionfront?language=${language}`);
export const getSubscription = (id) => axios.get(`${API_URL}/${id}`);
export const createSubscription = (subscription) => axios.post(API_URL, subscription);
export const updateSubscription = (id, subscription) => axios.put(`${API_URL}/${id}`, subscription);
export const deleteSubscription = (id) => axios.delete(`${API_URL}/${id}`);