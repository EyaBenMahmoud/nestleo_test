// services/userService.js
import api from './api';

export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  await api.delete(`/users/${userId}`);
};



export const createAdmin  = async (userData) => {

  const response = await api.post('/users/addAdmin', userData);
  return response.data;

}




export const updateAdmin = async (userId,userData) => {

  const response = await api.put(`/users/${userId}`, userData);
  return response.data;

}
