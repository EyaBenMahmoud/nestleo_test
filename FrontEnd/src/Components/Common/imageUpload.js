import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { updateUserAvatar } from "../../slices/login/loginSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./ImageUpload.css"; // Import CSS file

const ImageUpload = ({ avatarUpdated, profileImage }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleSubmit(selectedFile);
    }
  };

  const handleSubmit = async (selectedFile) => {
    if (!selectedFile) {
      toast.error("No file selected!");
      return;
    }
    if (!token) {
      toast.error("No authentication token found!");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", selectedFile);

    setLoading(true);
    try {
      await dispatch(updateUserAvatar({ formData, token })).unwrap();
      avatarUpdated((prev) => !prev);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      toast.error("Error uploading avatar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-image">
        <img src={profileImage || "/default-avatar.jpg"} alt="Profile" />
        <div className="overlay">
          <label className="upload-btn">
            <input type="file" accept="image/*" onChange={handleFileChange} />
            📸 Change Photo
          </label>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
