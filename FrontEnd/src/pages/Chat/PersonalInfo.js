import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Offcanvas,
  OffcanvasBody,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown
} from "reactstrap";
import { useSelector } from "react-redux";
import Img9 from "../../assets/images/small/img-9.jpg";
import dummyImage from "../../assets/images/users/user-dummy-img.jpg";
import DropImage from "../../Components/Common/displayDropdown";
import FilePreviewModal from "./filePreviewModal";
import { withTranslation } from "react-i18next";

const Attachements = ({ attachement, onPreview, t }) => {
  // Determine icon based on file type or extension
  const getIcon = () => {
    const extension = attachement.filename?.split('.').pop()?.toLowerCase();

    if (attachement.type === "image" || ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) {
      return "ri-image-line";
    }

    const iconMap = {
      'doc': 'file-word-line', 'docx': 'file-word-line',
      'xls': 'file-excel-line', 'xlsx': 'file-excel-line',
      'ppt': 'file-ppt-line', 'pptx': 'file-ppt-line',
      'pdf': 'file-pdf-line',
      'zip': 'file-zip-line', 'rar': 'file-zip-line',
      'txt': 'file-text-line', 'csv': 'file-list-line', 'json': 'code-s-slash-line',
      'mp3': 'file-music-line', 'wav': 'file-music-line',
      'mp4': 'file-video-line', 'avi': 'file-video-line',
    };

    return iconMap[extension] || "file-line";
  };

  // Format file size (bytes to KB/MB)
  const formatSize = (size) => {
    if (!size) return t('chat.unknown');
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle preview click
  const handleClick = (e) => {
    e.preventDefault();
    if (onPreview) onPreview(attachement);
  };
  return (
    <div className="border rounded border-dashed p-2">
      <div className="d-flex align-items-center">
        <div className="flex-shrink-0 me-3">
          <div className="avatar-xs">
            <div className="avatar-title bg-light text-secondary rounded fs-20">
              <i className={getIcon()}></i>
            </div>
          </div>
        </div>
        <div className="flex-grow-1 overflow-hidden">
          <h5 className="fs-13 mb-1">
            <Link to="#" onClick={handleClick} className="text-body text-truncate d-block">
              {attachement.filename || t('chat.unknown')}
            </Link>
          </h5>
          <div className="text-muted">{formatSize(attachement.size)}</div>
        </div>
        <div className="flex-shrink-0 ms-2">
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-icon text-muted btn-sm fs-18"
              onClick={() => {
                const link = document.createElement('a');
                link.href = attachement.url;
                link.setAttribute('download', attachement.filename || 'file');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <i className="ri-download-2-line"></i>
            </button>
            <UncontrolledDropdown>
              <DropdownToggle
                tag="button"
                className="btn btn-icon text-muted btn-sm fs-18 dropdown"
              >
                <i className="ri-more-fill"></i>
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={handleClick}>
                  <i className="ri-eye-line align-bottom me-2 text-muted"></i>{" "}
                  {t('chat.preview')}
                </DropdownItem>
                <DropdownItem onClick={() => {
                  const link = document.createElement('a');
                  link.href = attachement.url;
                  link.setAttribute('download', attachement.filename || 'file');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <i className="ri-download-2-line align-bottom me-2 text-muted"></i>{" "}
                  {t('chat.download')}
                </DropdownItem>

              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this component for group members display
const GroupMember = ({ member, isOnline, isCreator, t }) => {
  return (
    <div className="d-flex align-items-center py-2 border-bottom">
      <div className="avatar-xs me-3">
        {member.avatar ? (
          <DropImage
            userId={member._id}
            className="rounded-circle img-fluid"
          />
        ) : (
          <div className="avatar-title rounded-circle bg-soft-primary text-primary">
            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-grow-1">
        <h5 className="font-size-14 mb-0">
          <Link to="#" className="text-dark">
            {member.firstName} {member.lastName}
            {isCreator && <span className="badge bg-primary font-size-10 ms-1">{t('chat.roleLabels.Admin')}</span>}
          </Link>
        </h5>
      </div>
      <div className="flex-shrink-0">
        <i className={`ri-checkbox-blank-circle-fill font-size-10 ${isOnline ? 'text-success' : 'text-secondary'}`}></i>
      </div>
    </div>
  );
};

const PersonalInfo = ({ show, onCloseClick, currentuser, cuurentiseImg, participant, isGroup, onlineUsers, userId, t }) => {
  const [menu1, setMenu1] = useState(false);
  const [menu2, setMenu2] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [filePreviewModal, setFilePreviewModal] = useState(false);

  // Redux state
  const { messages, activeChatId, chats } = useSelector((state) => state.chat);

  // Find the current chat object to get participants and creator
  const currentChat = chats.find(chat => chat._id === activeChatId);
  const groupCreatorId = currentChat?.createdBy;
  const groupMembers = currentChat?.participants || [];

  // Get media from messages
  const getMediaAttachments = () => {
    if (!activeChatId || !messages[activeChatId]) return [];
    const mediaItems = [];
    messages[activeChatId].forEach((message) => {
      if (message.content?.media?.length) {
        message.content.media.forEach((media) => {
          mediaItems.push({
            type: media.type, // 'image' or 'file'
            filename: media.filename || `media-${mediaItems.length + 1}`,
            size: media.size,
            url: media.url,
          });
        });
      }
    });
    return mediaItems;
  };

  const mediaAttachments = getMediaAttachments();

  // Personal details from participant (or placeholders)
  const personalDetails = {
    phone: participant?.phoneNumber || t('chat.notSpecified', 'Not provided'),
    email: participant?.email || t('chat.notSpecified', 'Not provided'),
    location: participant?.city + "," + participant?.country || t('chat.notSpecified', 'Not provided'),
  };

  // Handle file preview
  const handlePreviewFile = (file) => {
    setPreviewFile(file);
    setFilePreviewModal(true);
  };

  return (
    <>
      <Offcanvas
        isOpen={show}
        direction="end"
        className="offcanvas-end border-0"
        toggle={onCloseClick}
      >
        <OffcanvasBody className="offcanvas-body profile-offcanvas p-0">
          <div className="team-cover">
            <img src={Img9} alt="" className="img-fluid" />
          </div>
          <div className="p-1 pb-4 pt-0">
            <div className="team-settings">
              <div className="row g-0">
                <div className="col">
                  <div className="btn nav-btn">
                    <Button
                      onClick={onCloseClick}
                      color=""
                      className="btn-close btn-close-white"
                    ></Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

<div className="p-3 text-center">
  {/* Conditional rendering based on group vs individual chat */}
  {isGroup ? (
    <>
      {/* Group Avatar */}
      <div className={`group-avatar-large mx-auto mb-3 ${
        currentChat?.groupType === 'SyndicateAdmin-Coowner' ? 'coowner-group-avatar' :
        currentChat?.groupType === 'Admin-SyndicateAdmin' ? 'syndicate-group-avatar' :
        currentChat?.groupType === 'Admin-Worker' || currentChat?.groupType === 'SyndicateAdmin-Worker' ? 'worker-group-avatar' : ''
      }`}>
        <span className="group-icon-large">#</span>
      </div>
    </>
  ) : (
    <>
      {/* Individual user avatar */}
      {cuurentiseImg ? (
        <DropImage
          userId={cuurentiseImg}
          className="avatar-lg img-thumbnail rounded-circle mx-auto profile-img"
        />
      ) : (
        <img
          src={dummyImage}
          alt=""
          className="avatar-lg img-thumbnail rounded-circle mx-auto profile-img"
        />
      )}
    </>
  )}
  
  {/* Username and status section */}
  <div className="mt-3 text-center">
    <h5 className="fs-16 mb-1">
      <Link to="#" className="link-primary username">
        {currentuser}
      </Link>
    </h5>
    
    {/* Status indicators */}
    {isGroup ? (
      <>
        <p className="text-muted mb-2">
          {currentChat?.groupType === 'SyndicateAdmin-Coowner' ? t('chat.groupTypes.coOwners') :
           currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.groupTypes.syndicateAdmins') :
           currentChat?.groupType === 'Admin-Worker' || currentChat?.groupType === 'SyndicateAdmin-Worker' ? t('chat.groupTypes.workers') : t('chat.groupTypes.group')}
        </p>
        <p className="text-muted mb-0">
          <i className="ri-user-3-line me-1"></i> {groupMembers.length} {t('chat.members')} • {groupMembers.filter(p => onlineUsers.includes(p._id)).length} {t('chat.online')}
        </p>
      </>
    ) : (
      <p className="d-flex justify-content-center align-items-center mb-0">
        <i className={`ri-checkbox-blank-circle-fill me-2 align-bottom ${onlineUsers.includes(userId) ? 'text-success' : 'text-secondary'}`}></i>
        <span className={onlineUsers.includes(userId) ? 'text-success' : 'text-secondary'}>
          {onlineUsers.includes(userId) ? t('chat.online') : t('chat.offline')}
        </span>
      </p>
    )}
  </div>
</div>

{/* Group description section - only for groups */}
{isGroup && currentChat?.groupDescription && (
  <div className="border-top border-top-dashed p-3">
    <h5 className="fs-15 mb-3">{t('chat.groupDescription')}</h5>
    <p className="text-muted">{currentChat.groupDescription}</p>
    <div className="d-flex align-items-center mt-3">
      <div className="flex-grow-1">
        <p className="text-muted mb-0">
          <i className="ri-calendar-line me-1"></i> {t('chat.created')}: {new Date(currentChat.createdAt).toLocaleDateString()}
        </p>
      </div>
      {currentChat.updatedAt !== currentChat.createdAt && (
        <div>
          <p className="text-muted mb-0">
            <i className="ri-edit-2-line me-1"></i> {t('chat.updated')}: {new Date(currentChat.updatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  </div>
)}

          {/* Group members section */}
          {isGroup && (
            <div className="border-top border-top-dashed p-3">
              <h5 className="fs-15 mb-3">{t('chat.members')}</h5>
              <div className="vstack gap-2">
                {groupMembers.map((member, idx) => (
                  <GroupMember
                    key={idx}
                    member={member}
                    isOnline={onlineUsers.includes(member._id)}
                    isCreator={groupCreatorId === member._id}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Individual user details section */}
          {!isGroup && (
            <div className="border-top border-top-dashed p-3">
              <h5 className="fs-15 mb-3">{t('chat.viewProfile')}</h5>
              <div className="mb-3">
                <p className="text-muted text-uppercase fw-medium fs-12 mb-1">
                  {t('auth.phoneNumber')}
                </p>
                <h6>{personalDetails.phone}</h6>
              </div>
              <div className="mb-3">
                <p className="text-muted text-uppercase fw-medium fs-12 mb-1">
                  {t('auth.email')}
                </p>
                <h6>{personalDetails.email}</h6>
              </div>
              <div>
                <p className="text-muted text-uppercase fw-medium fs-12 mb-1">
                  {t('chat.location')}
                </p>
                <h6 className="mb-0">{personalDetails.location}</h6>
              </div>
            </div>
          )}

          <div className="border-top border-top-dashed p-3">
            <h5 className="fs-15 mb-3">{t('calendar.attachedDocuments')}</h5>
            <div className="vstack gap-2">
              {mediaAttachments.length > 0 ? (
                mediaAttachments.map((attachement, key) => (
                  <Attachements
                    attachement={attachement}
                    key={key}
                    onPreview={handlePreviewFile}
                    t={t}
                  />
                ))
              ) : (
                <p className="text-muted text-center">{t('chat.noResults')}</p>
              )}
            </div>
          </div>
        </OffcanvasBody>
      </Offcanvas>
      <FilePreviewModal
        isOpen={filePreviewModal}
        toggle={() => setFilePreviewModal(!filePreviewModal)}
        file={previewFile}
        t={t}
      />
    </>
  );
};

export default withTranslation()(PersonalInfo);