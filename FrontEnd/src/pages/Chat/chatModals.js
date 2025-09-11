import React from 'react';
import {
  Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input, Button
} from 'reactstrap';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { withTranslation } from 'react-i18next';
import {
  createRoleSpecificGroup,
  updateGroup,
  addParticipants,
  removeParticipant
} from '../../slices/chat/reducer';
import DropImage from '../../Components/Common/displayDropdown';

const ChatModals = ({
  // Group creation modal props
  groupModal,
  toggleGroupModal,
  groupName,
  setGroupName,
  groupDescription,
  setGroupDescription,
  selectedParticipants,
  setSelectedParticipants,
  adminGroupType,
  setAdminGroupType,
  participantFilter,
  setParticipantFilter,
  coOwnerFilter,
  setCoOwnerFilter,
  getFilteredCoOwners,
  getFilteredParticipantOptions,

  // Group management modal props
  manageGroupModal,
  toggleManageGroupModal,
  currentChat,
  user,
  newParticipants,
  setNewParticipants,
  getEligibleNewParticipants,

  // Rename group modal props
  renameGroupModal,
  toggleRenameGroupModal,
  newGroupName,
  setNewGroupName,
  newGroupDescription,
  setNewGroupDescription,

  // Common props
  userChatOpen,
  t
}) => {
  
  const dispatch = useDispatch();
  const { groupAvailableUsers } = useSelector((state) => state.chat);
  const getEligibleParticipants = () => {
    return groupAvailableUsers
      .filter(u => u._id !== user.id)
      .map(u => ({
        value: u._id,
        label: `${u.firstName} ${u.lastName || ''}`,
        role: u.role
      }));
  };

  // Handler for creating a new group
  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      toast.error(t('chat.pleaseEnterGroupNameAndParticipants'));
      return;
    }

    const participants = selectedParticipants.map(p => p.value);

    if (user.role === 'SyndicateAdmin') {
      dispatch(createRoleSpecificGroup({
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        participants,
        groupType: 'SyndicateAdmin-Coowner'
      }))
        .unwrap()
        .then((group) => {
          toggleGroupModal();
          toast.success(t('chat.coOwnerGroupCreatedSuccess'));
          userChatOpen(group);
        })
        .catch((err) => {
          toast.error(err || t('chat.failedToCreateGroup'));
        });
    } else if (user.role === 'Admin') {
      dispatch(createRoleSpecificGroup({
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        participants,
        groupType: adminGroupType
      }))
        .unwrap()
        .then((group) => {
          toggleGroupModal();
          toast.success(adminGroupType === 'Admin-SyndicateAdmin' ? 
            t('chat.syndicateAdminGroupCreatedSuccess') : 
            t('chat.workerGroupCreatedSuccess'));
          userChatOpen(group);
        })
        .catch((err) => {
          toast.error(err || t('chat.failedToCreateGroup'));
          console.error('Group creation error:', err);
        });
    } else {
      // Handle other roles if needed
      toast.error(t('chat.yourRoleCannotCreateGroups'));
    }
  };

  // Handler for adding participants to a group
  const handleAddParticipants = async () => {
    if (!currentChat || newParticipants.length === 0) return;

    try {
      const result = await dispatch(
        addParticipants({
          chatId: currentChat._id,
          participantIds: newParticipants.map(p => p.value)
        })
      ).unwrap();

      toast.success(t('chat.participantsAddedSuccess'));
      toggleManageGroupModal();
    } catch (error) {
      toast.error(error?.message || t('chat.failedToAddParticipants'));
    }
  };

  // Handler for removing a participant from a group
  const handleRemoveParticipant = async (participantId) => {
    if (!currentChat) return;

    try {
      await dispatch(
        removeParticipant({
          chatId: currentChat._id,
          participantId
        })
      ).unwrap();

      toast.success(t('chat.participantRemoved'));
    } catch (error) {
      toast.error(error?.message || t('chat.failedToRemoveParticipant'));
    }
  };

  // Handler for renaming a group
  const handleRenameGroup = async () => {
    if (!currentChat || !currentChat._id) {
      toast.error(t('chat.invalidGroupSelection'));
      return;
    }

    if (!newGroupName.trim()) {
      toast.error(t('chat.groupNameCannotBeEmpty'));
      return;
    }

    try {
      await dispatch(updateGroup({
        chatId: currentChat._id,
        name: newGroupName.trim(),
        description: newGroupDescription.trim()
      })).unwrap();

      toast.success(t('chat.groupUpdatedSuccess'));
      toggleRenameGroupModal();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(error?.message || t('chat.failedToUpdateGroup'));
    }
  };

  return (
    <>
      {/* Create Group Modal */}
      <Modal isOpen={groupModal} toggle={toggleGroupModal} centered className="group-modal">
        <ModalHeader toggle={toggleGroupModal}>
          {user.role === 'SyndicateAdmin' ? t('chat.createCoOwnerGroup') :
            user.role === 'Admin' ? t('chat.createGroup') :
              t('chat.createNewGroup')}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="groupName">{t('chat.groupName')} <span className="text-danger">*</span></Label>
            <Input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('chat.enterGroupName')}
            />
          </FormGroup>

          {(user.role === 'SyndicateAdmin' || user.role === 'Admin') && (
            <FormGroup>
              <Label for="groupDescription">{t('chat.groupDescription')}</Label>
              <Input
                type="textarea"
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder={t('chat.enterGroupDescription')}
                rows={3}
              />
            </FormGroup>
          )}

          {/* Group Type Selection for Admin users */}
          {user.role === 'Admin' && (
            <FormGroup>
              <Label for="groupType">{t('chat.groupType')} <span className="text-danger">*</span></Label>
              <div className="mb-3">
                <div className="form-check form-check-inline">
                  <Input
                    type="radio"
                    id="syndicateAdminGroup"
                    name="adminGroupType"
                    value="Admin-SyndicateAdmin"
                    checked={adminGroupType === 'Admin-SyndicateAdmin'}
                    onChange={() => setAdminGroupType('Admin-SyndicateAdmin')}
                    className="form-check-input"
                  />
                  <Label className="form-check-label" for="syndicateAdminGroup">
                    {t('chat.syndicateAdminGroup')}
                  </Label>
                </div>
                <div className="form-check form-check-inline">
                  <Input
                    type="radio"
                    id="workerGroup"
                    name="adminGroupType"
                    value="Admin-Worker"
                    checked={adminGroupType === 'Admin-Worker'}
                    onChange={() => setAdminGroupType('Admin-Worker')}
                    className="form-check-input"
                  />
                  <Label className="form-check-label" for="workerGroup">
                    {t('chat.workerGroup')}
                  </Label>
                </div>
              </div>
            </FormGroup>
          )}

          <FormGroup>
            <Label for="participants">
              {user.role === 'SyndicateAdmin' ? t('chat.selectCoOwners') :
                user.role === 'Admin' && adminGroupType === 'Admin-SyndicateAdmin' ? t('chat.selectSyndicateAdmins') :
                  user.role === 'Admin' && adminGroupType === 'Admin-Worker' ? t('chat.selectWorkers') :
                    t('chat.addParticipants')} <span className="text-danger">*</span>
            </Label>

            <Select
              isMulti
              id="participants"
              name="participants"
              options={getFilteredParticipantOptions()}
              className="basic-multi-select"
              classNamePrefix="select"
              value={selectedParticipants}
              onChange={setSelectedParticipants}
              placeholder={user.role === 'SyndicateAdmin' ? t('chat.selectCoOwnersPlaceholder') :
                adminGroupType === 'Admin-SyndicateAdmin' ? t('chat.selectSyndicateAdminsPlaceholder') :
                  adminGroupType === 'Admin-Worker' ? t('chat.selectWorkersPlaceholder') :
                    t('chat.selectParticipantsPlaceholder')}
            />

            {selectedParticipants.length > 0 && (
              <div className="selected-count mt-2 text-muted">
                {selectedParticipants.length} {t('chat.participantsSelected')}
              </div>
            )}
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggleGroupModal}>{t('chat.cancel')}</Button>
          <Button
            color="primary"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedParticipants.length === 0}
          >
            {user.role === 'SyndicateAdmin' ? t('chat.createCoOwnerGroup') :
              user.role === 'Admin' && adminGroupType === 'Admin-SyndicateAdmin' ? t('chat.createSyndicateAdminGroup') :
                user.role === 'Admin' && adminGroupType === 'Admin-Worker' ? t('chat.createWorkerGroup') :
                  t('chat.createGroup')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Group Management Modal */}
      <Modal
        isOpen={manageGroupModal}
        toggle={toggleManageGroupModal}
        centered
        className="group-modal"
      >
        <ModalHeader toggle={toggleManageGroupModal}>
          {user.role === 'SyndicateAdmin' ? t('chat.manageCoOwnerGroup') :
            currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.manageSyndicateAdminGroup') :
              t('chat.manageWorkerGroup')}
        </ModalHeader>
        <ModalBody>
          <h6>
            {user.role === 'SyndicateAdmin' ? t('chat.currentCoOwners') :
              currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.currentSyndicateAdmins') :
                t('chat.currentWorkers')}
          </h6>
          <ul className="list-group mb-3">
            {currentChat?.participants
              .filter(p => p._id !== user.id)
              .map(participant => (
                <li key={participant._id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <DropImage userId={participant} className="rounded-circle avatar-xs me-2" />
                    <span>{participant.firstName} {participant.lastName}</span>
                  </div>
                  <Button
                    color="danger"
                    size="sm"
                    className="btn-sm rounded-circle"
                    onClick={() => handleRemoveParticipant(participant._id)}
                  >
                    <i className="ri-close-line"></i>
                  </Button>
                </li>
              ))}
          </ul>

          <FormGroup>
            <Label for="newParticipants">
              {user.role === 'SyndicateAdmin' ? t('chat.addCoOwners') :
                currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.addSyndicateAdmins') :
                  t('chat.addWorkers')}
            </Label>
            <Select
              isMulti
              id="newParticipants"
              name="newParticipants"
              options={getFilteredParticipantOptions()}
              className="basic-multi-select"
              classNamePrefix="select"
              value={newParticipants}
              onChange={setNewParticipants}
              placeholder={user.role === 'SyndicateAdmin' ? t('chat.selectCoOwnersToAddPlaceholder') :
                currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.selectSyndicateAdminsToAddPlaceholder') :
                  t('chat.selectWorkersToAddPlaceholder')}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggleManageGroupModal}>{t('chat.cancel')}</Button>
          <Button
            color="primary"
            onClick={handleAddParticipants}
            disabled={newParticipants.length === 0}
          >
            {user.role === 'SyndicateAdmin' ? t('chat.addSelectedCoOwners') :
              currentChat?.groupType === 'Admin-SyndicateAdmin' ? t('chat.addSelectedSyndicateAdmins') :
                t('chat.addSelectedWorkers')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Group Rename Modal */}
      <Modal isOpen={renameGroupModal} toggle={toggleRenameGroupModal} centered>
        <ModalHeader toggle={toggleRenameGroupModal}>
          {t('chat.updateGroupInfo')}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="newGroupName">{t('chat.groupName')}</Label>
            <Input
              type="text"
              id="newGroupName"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t('chat.enterGroupName')}
            />
          </FormGroup>
          <FormGroup>
            <Label for="newGroupDescription">{t('chat.groupDescription')}</Label>
            <Input
              type="textarea"
              id="newGroupDescription"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder={t('chat.enterGroupDescription')}
              rows={3}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggleRenameGroupModal}>{t('chat.cancel')}</Button>
          <Button
            color="primary"
            onClick={handleRenameGroup}
            disabled={!newGroupName.trim()}
          >
            {t('chat.updateGroup')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default withTranslation()(ChatModals);