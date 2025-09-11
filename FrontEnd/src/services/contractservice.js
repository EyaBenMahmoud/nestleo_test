import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/api/Contracts`;

export const getContract = () => axios.get(API_URL);
export const getContractById = (id) => axios.get(`${API_URL}/${id}`);
export const getArchivedContracts = () => axios.get(`${API_URL}/archived`);
export const createContract = (Contract) => axios.post(API_URL, Contract);
export const updateContract = (id, Contract) => axios.put(`${API_URL}/${id}`, Contract);
export const deleteContract = (id) => axios.delete(`${API_URL}/${id}`);
export const archiveContract = async (id) => {
    const response = await axios.put(`${API_URL}/${id}/archive`);
    return response.data;
};
export const getContractsByUser = (userId) => axios.get(`${API_URL}/user/${userId}`);
export const getBuildingCoOwners = (buildingId) => axios.get(`${API_URL}/api/building/${buildingId}`);