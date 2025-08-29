import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { updateUser } from '../../slices/users/userSlice';

const EditUser = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list } = useSelector((state) => state.users);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    SubRole: ''
  });

  useEffect(() => {
    const user = list.find(u => u._id === id);
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        SubRole: user.SubRole
      });
    }
  }, [id, list]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(updateUser({ id, userData: formData }));
    
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/users');
    }
  };

  return (
    <div className="container">
      <h2>Edit User</h2>
      <form onSubmit={handleSubmit}>
        {/* Similar form fields to CreateUser */}
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
        {/* Add other fields */}
        <button type="submit">Update User</button>
      </form>
    </div>
  );
};

export default EditUser;