import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserAvatar, updateUserAvatarUrl } from '../../slices/login/loginSlice';
import { toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import "./ImageUpload.css"; // Import CSS file
import avatar from "../../assets/images/users/avatar-1.jpg";
import defaultAvatar from "../../assets/images/users/avatar-1.jpg"; 

const AvatarDisplay = ({ userId }) => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");
  const [avatarUpdated, setAvatarUpdated] = useState(false);
  const userAvatarUrl = useSelector((state) => state.Loginn.userAvatarUrl);
  const user = useSelector(state => state.Loginn.user);

  const avatarSrc = user?.avatar || defaultAvatar;

  useEffect(() => {

    if (!userId) return; // Prevent API call if userId is undefined

    const fetchAvatar = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/image/${userId}/avatar`);
        if (!response.ok) throw new Error("Failed to load avatar");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAvatarUrl(url);
        dispatch(updateUserAvatarUrl(url)); // Update Redux state with the new URL

        console.log("while upload", userAvatarUrl)
      } catch (error) {
        console.error("Error fetching avatar:", error);
      }
    };

    fetchAvatar();
  }, [userId, avatarUpdated]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      toast.error("No file selected!");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", selectedFile);

    setLoading(true);
    try {
      if (!token) {
        toast.error("No authentication token found!");
        return;
      }

      await dispatch(updateUserAvatar({ formData, token })).unwrap();

      setAvatarUpdated(prev => !prev);  // Toggle state to trigger re-render
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      toast.error("Error uploading avatar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="avatar-container">
      {loading && <div className="spinner"></div>} {/* Always visible when loading */}

      <img
        src={avatarSrc}
        alt="User Avatar"
        className={`avatar-image ${loading ? 'loading' : ''}`}
        onError={e => {
          e.target.onerror = null;
          e.target.src = defaultAvatar;
        }}
      />

      <div className="overlay">
        <label className="upload-btn">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading} // Disable while uploading
          />
          {loading ? "Uploading..." : "📸 Change Photo"}
        </label>
      </div>
    </div>
  );

};

export default AvatarDisplay;



