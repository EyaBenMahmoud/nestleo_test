import React, { memo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import defaultAvatar from "../../assets/images/users/avatar-1.jpg";
import "./toastNotification.css"; // Create this CSS file with the styles below

const DropImage = memo(({ userId, avatar, className = "", alt = "User avatar", buildingId = null, hardcoded = null }) => {
  const [frame, setFrame] = useState(null);
  const avatarSrc = userId?.avatar || avatar || defaultAvatar;
  const currentBuilding = useSelector(state => state.Building.currentBuilding || {});
  const activeBuildingId = buildingId || currentBuilding?._id;

  useEffect(() => {
    console.log("DropImage props:", { userId, buildingId, activeBuildingId });
        // For debugging - force a specific frame if hardcoded prop is provided
    if (hardcoded) {
      setFrame(hardcoded);
      return;
    }
    
    // Only apply frames to SyndicateCoowner users
    if (userId?.role !== "SyndicateCoowner" || !activeBuildingId) {
      setFrame(null);
      return;
    }

    // Log the gamification data for debugging
    console.log("User gamification data:", userId?.gamification);
    
    // FIXED: Access building data properly from object (not Map)
    const buildingStats = userId?.gamification?.buildings?.[activeBuildingId];
    console.log("Building stats for", activeBuildingId, ":", buildingStats);

    // If no gamification data or no rank, don't show a frame
    if (!buildingStats || typeof buildingStats.rank !== 'number') {
      console.log("No valid rank found, disabling frame");
      setFrame(null);
      return;
    }

    // Set frame based on rank
    const rank = buildingStats.rank;
    console.log("User rank:", rank);
    
    switch (rank) {
      case 1:
        setFrame('gold');
        break;
      case 2:
        setFrame('silver');
        break;
      case 3:
        setFrame('bronze');
        break;
      default:
        setFrame('casual');
    }
  }, [userId, activeBuildingId, hardcoded]);

  // Frame styles
  const getFrameStyle = () => {
    switch (frame) {
      case 'gold':
        return {
          boxShadow: '0 0 0 3px #FFD700, 0 0 0 6px rgba(255, 215, 0, 0.3)',
          border: '2px solid #FFD700'
        };
      case 'silver':
        return {
          boxShadow: '0 0 0 3px #C0C0C0, 0 0 0 6px rgba(192, 192, 192, 0.3)',
          border: '2px solid #C0C0C0'
        };
      case 'bronze':
        return {
          boxShadow: '0 0 0 3px #CD7F32, 0 0 0 6px rgba(205, 127, 50, 0.3)',
          border: '2px solid #CD7F32'
        };
      case 'casual':
        return {
          boxShadow: '0 0 0 2px #e0e0e0',
          border: '1px solid #e0e0e0'
        };
      default:
        return {};
    }
  };

  // Log the current frame for debugging
  console.log("Current frame:", frame);

  return (
    <div className="avatar-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={avatarSrc || defaultAvatar}
        alt={alt}
        // FIXED: Added the frame type class
        className={`${className} ${frame ? `avatar-with-frame ${frame}-frame` : ''}`}
        style={{
          ...getFrameStyle(),
          borderRadius: className.includes('rounded-circle') ? '50%' : className.includes('rounded') ? '8px' : '0'
        }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = defaultAvatar;
        }}
      />
      {frame === 'gold' && (
        <div className="rank-indicator"
          style={{
            position: 'absolute',
            bottom: '-5px',
            right: '-5px',
            backgroundColor: '#FFD700',
            color: '#000',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
          1
        </div>
      )}
    </div>
  );
});

export default DropImage;