import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, Button, Input, FormFeedback } from 'reactstrap';
import { createContract, updateContract } from '../../services/contractservice';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCoOwners, getAllCoowners } from "../../slices/buildings/building";
import { withTranslation } from 'react-i18next';

const ContractModal = ({ 
  isOpen, 
  toggle, 
  contract, 
  onSave, 
  readOnly = false, 
  viewOnly = false, 
  disableEditing = false, 
  currentUser, 
  onClosed,
  preselectedUsers = [],
  isBuildingContract = false,
  buildingId = null,
  inlineModal = false,
  t
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.Loginn || {});
  const currentBuilding = useSelector(state => state.Building?.currentBuilding);
  const { coOwners, loading: coOwnersLoading } = useSelector((state) => state.Building);
  const effectiveBuildingId = buildingId || (currentBuilding?._id);
  const isReadOnly = readOnly || viewOnly || disableEditing;

  const [formData, setFormData] = useState({
    contractNumber: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    terms: '',
    signedBy: currentUser?._id || '',
    coOwner: '',
    status: 'Draft',
    building: effectiveBuildingId
  });

  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [buildingInfo, setBuildingInfo] = useState(null);
  const [usersFetched, setUsersFetched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!effectiveBuildingId) {
        dispatch(getAllCoowners());
      } else {
        dispatch(fetchCoOwners(effectiveBuildingId));
      }
    }
  }, [dispatch, isOpen, effectiveBuildingId]);

  const fetchUsers = useCallback(async () => {
    if (!isOpen || usersFetched) return;
    
    try {
      if (preselectedUsers && preselectedUsers.length > 0) {
        setUsers(preselectedUsers);
      } else if (effectiveBuildingId) {
        if (coOwners && coOwners.length > 0) {
          setUsers(coOwners);
        } else if (buildingInfo && buildingInfo.coOwners) {
          setUsers(buildingInfo.coOwners);
        }
      } else if (user?.role === 'SuperAdmin') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/users/allU`);
        const data = await response.json();
        setUsers(data);
      }
      setUsersFetched(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [isOpen, preselectedUsers, effectiveBuildingId, buildingInfo, coOwners, user?.role, usersFetched]);

  useEffect(() => {
    if (isOpen && !usersFetched) {
      fetchUsers();
    }
    if (!isOpen) {
      setUsersFetched(false);
    }
  }, [isOpen, fetchUsers, usersFetched]);

  useEffect(() => {
    if (isOpen && effectiveBuildingId && coOwners && coOwners.length > 0) {
      setUsers(coOwners);
      setUsersFetched(true);
    }
  }, [coOwners, effectiveBuildingId, isOpen]);

  useEffect(() => {
    if (contract) {
      setFormData({
        contractNumber: contract.contractNumber || '',
        title: contract.title || '',
        description: contract.description || '',
        startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
        endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
        terms: contract.terms || '',
        signedBy: contract.signedBy?._id || currentUser?._id || '',
        coOwner: contract.coOwner || '',
        status: contract.status || 'Draft',
        building: contract.building?._id || effectiveBuildingId || ''
      });
    } else {
      const randomNum = Math.floor(Math.random() * 10000);
      setFormData({
        contractNumber: `CONT-${new Date().getFullYear()}-${randomNum}`,
        title: isBuildingContract ? t('contractModal.form.buildingContractTitle', { buildingName: currentBuilding?.name || '' }) : '',
        description: isBuildingContract ? 
          t('contractModal.form.buildingContractDescription', { 
            buildingName: currentBuilding?.name || '', 
            address: currentBuilding?.address_street || ''
          }) : '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        terms: '',
        signedBy: currentUser?._id || '',
        coOwner: '',
        status: currentUser?.role === 'SyndicateAdmin' ? 'Active' : 'Draft',
        building: effectiveBuildingId || ''
      });
    }
    setErrors({});
  }, [contract, isOpen, currentUser, isBuildingContract, currentBuilding, effectiveBuildingId, t]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.contractNumber.trim()) newErrors.contractNumber = t('contractModal.errors.contractNumberRequired');
    if (!formData.title.trim()) newErrors.title = t('contractModal.errors.titleRequired');
    if (!formData.description.trim()) newErrors.description = t('contractModal.errors.descriptionRequired');
    if (!formData.startDate) newErrors.startDate = t('contractModal.errors.startDateRequired');
    if (!formData.endDate) newErrors.endDate = t('contractModal.errors.endDateRequired');
    if (!formData.terms.trim()) newErrors.terms = t('contractModal.errors.termsRequired');
    
    if (currentUser?.role !== 'SyndicateAdmin' && !formData.signedBy) {
      newErrors.signedBy = t('contractModal.errors.signedByRequired');
    }
    
    if (isBuildingContract && (!formData.coOwner || formData.coOwner === '')) {
      newErrors.coOwner = t('contractModal.errors.coOwnerRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    if (isReadOnly) return;
    
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isReadOnly) {
      toggle();
      return;
    }
    
    if (!validateForm()) return;

    try {
      let contractData = {...formData};
      const creatorId = user?.id || currentUser?.id;
      contractData.createdBy = creatorId;
      
      if ((user?.role === 'SyndicateAdmin') || (currentUser?.role === 'SyndicateAdmin')) {
        contractData.signedBy = creatorId;
      }
      
      if (isBuildingContract) {
        contractData.building = formData.building || effectiveBuildingId;
        contractData.contractType = 'co-owner';
      }
      
      if (contract) {
        await updateContract(contract._id, contractData);
      } else {
        await createContract(contractData);
      }
      if (onSave) onSave();
      if (!inlineModal) toggle();
    } catch (error) {
      console.error('Error saving contract:', error);
      alert(t('contractModal.errors.saveFailed', { message: error.message || t('contractModal.errors.unknownError') }));
    }
  };

  const getSignedByDisplayName = () => {
    if (!formData.signedBy) return '';
    const user = users.find(u => u._id === formData.signedBy);
    return user ? user.email : '';
  };

  const renderBuildingInfo = () => {
    if (!effectiveBuildingId) return null;
    
    let buildingName = '';
    if (currentBuilding) {
      buildingName = t('contractModal.form.buildingInfo', {
        name: currentBuilding.name,
        street: currentBuilding.address_street,
        city: currentBuilding.address_city
      });
    } else if (buildingInfo) {
      buildingName = t('contractModal.form.buildingInfo', {
        name: buildingInfo.name,
        street: buildingInfo.address_street,
        city: buildingInfo.address_city
      });
    } else {
      buildingName = t('contractModal.form.loadingBuildingInfo');
    }
    
    return (
      <div className="mb-3">
        <label>{t('contractModal.form.building')}</label>
        <Input
          type="text"
          className="form-control-plaintext"
          value={buildingName}
          readOnly
        />
      </div>
    );
  };

  const renderModalContent = () => (
    <Form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label>{t('contractModal.form.contractNumber')}</label>
        <Input
          type="text"
          name="contractNumber"
          value={formData.contractNumber}
          onChange={handleChange}
          invalid={!isReadOnly && !!errors.contractNumber}
          disabled={isReadOnly}
          readOnly={isReadOnly}
          className={isReadOnly ? "form-control-plaintext" : ""}
        />
        {!isReadOnly && <FormFeedback>{errors.contractNumber}</FormFeedback>}
      </div>

      {isBuildingContract && renderBuildingInfo()}

      <div className="mb-3">
        <label>{t('contractModal.form.title')}</label>
        <Input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          invalid={!isReadOnly && !!errors.title}
          disabled={isReadOnly}
          readOnly={isReadOnly}
          className={isReadOnly ? "form-control-plaintext" : ""}
        />
        {!isReadOnly && <FormFeedback>{errors.title}</FormFeedback>}
      </div>

      <div className="mb-3">
        <label>{t('contractModal.form.description')}</label>
        <Input
          type={isReadOnly ? "text" : "textarea"}
          name="description"
          value={formData.description}
          onChange={handleChange}
          invalid={!isReadOnly && !!errors.description}
          disabled={isReadOnly}
          readOnly={isReadOnly}
          className={isReadOnly ? "form-control-plaintext" : ""}
        />
        {!isReadOnly && <FormFeedback>{errors.description}</FormFeedback>}
      </div>

      <div className="mb-3">
        <label>{t('contractModal.form.startDate')}</label>
        {isReadOnly ? (
          <Input
            type="text"
            className="form-control-plaintext"
            value={formData.startDate ? new Date(formData.startDate).toLocaleDateString() : ''}
            readOnly
          />
        ) : (
          <>
            <Input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              invalid={!!errors.startDate}
            />
            <FormFeedback>{errors.startDate}</FormFeedback>
          </>
        )}
      </div>

      <div className="mb-3">
        <label>{t('contractModal.form.endDate')}</label>
        {isReadOnly ? (
          <Input
            type="text"
            className="form-control-plaintext"
            value={formData.endDate ? new Date(formData.endDate).toLocaleDateString() : ''}
            readOnly
          />
        ) : (
          <>
            <Input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              invalid={!!errors.endDate}
            />
            <FormFeedback>{errors.endDate}</FormFeedback>
          </>
        )}
      </div>

      <div className="mb-3">
        <label>{t('contractModal.form.terms')}</label>
        <Input
          type={isReadOnly ? "text" : "textarea"}
          name="terms"
          value={formData.terms}
          onChange={handleChange}
          invalid={!isReadOnly && !!errors.terms}
          disabled={isReadOnly}
          readOnly={isReadOnly}
          className={isReadOnly ? "form-control-plaintext" : ""}
        />
        {!isReadOnly && <FormFeedback>{errors.terms}</FormFeedback>}
      </div>

      {isBuildingContract && !isReadOnly && (
        <div className="mb-3">
          <label>{t('contractModal.form.coOwner')}</label>
          <Input
            type="select"
            name="coOwner"
            value={formData.coOwner}
            onChange={handleChange}
            invalid={!!errors.coOwner}
            disabled={coOwnersLoading}
          >
            <option value="">{t('contractModal.form.selectCoOwner')}</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.email} {user.firstname ? `- ${user.firstname} ${user.lastname}` : ''}
              </option>
            ))}
          </Input>
          <FormFeedback>{errors.coOwner}</FormFeedback>
          {coOwnersLoading && <small className="text-muted">{t('contractModal.form.loadingCoOwners')}</small>}
          {!coOwnersLoading && users.length === 0 && (
            <small className="text-muted">{t('contractModal.form.noCoOwners')}</small>
          )}
        </div>
      )}

      {(isReadOnly && formData.coOwner) && (
        <div className="mb-3">
          <label>{t('contractModal.form.coOwner')}</label>
          <Input
            type="text"
            className="form-control-plaintext"
            value={(() => {
              if (typeof formData.coOwner === 'object' && formData.coOwner !== null) {
                if (formData.coOwner.firstName || formData.coOwner.lastName) {
                  return `${formData.coOwner.firstName || ''} ${formData.coOwner.lastName || ''} (${formData.coOwner.email || t('contractModal.form.noEmail')})`.trim();
                } else if (formData.coOwner.email) {
                  return formData.coOwner.email;
                }
              }
              if (typeof formData.coOwner === 'string') {
                const user = users.find(u => u._id === formData.coOwner);
                if (user) {
                  if (user.firstName || user.lastName) {
                    return `${user.firstName || ''} ${user.lastName || ''} (${user.email || t('contractModal.form.noEmail')})`.trim();
                  } else if (user.email) {
                    return user.email;
                  }
                }
              }
              return t('contractModal.form.coOwnerNotAvailable');
            })()}
            readOnly
          />
        </div>
      )}

      {user.role === 'SuperAdmin' && (
        <div className="mb-3">
          <label>{t('contractModal.form.signedBy')}</label>
          {isReadOnly ? (
            <Input
              type="text"
              className="form-control-plaintext"
              value={contract?.signedBy?.email || getSignedByDisplayName()}
              readOnly
            />
          ) : (
            <>
              <Input
                type="select"
                name="signedBy"
                value={formData.signedBy}
                onChange={handleChange}
                invalid={!!errors.signedBy}
                disabled={isBuildingContract}
              >
                <option value="">{t('contractModal.form.selectUser')}</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.email} {user.firstname ? `- ${user.firstname} ${user.lastname}` : ''}
                  </option>
                ))}
              </Input>
              <FormFeedback>{errors.signedBy}</FormFeedback>
            </>
          )}
        </div>
      )}

      <div className="mb-3">
        <label>{t('contractModal.form.status')}</label>
        {isReadOnly ? (
          <Input
            type="text"
            className="form-control-plaintext"
            value={t(`contractModal.status.${formData.status.toLowerCase()}`, { defaultValue: formData.status })}
            readOnly
            style={{
              color: formData.status === 'Active' ? 'green' : 
                    formData.status === 'Draft' ? 'blue' :
                    formData.status === 'Expired' ? 'orange' : 'red'
            }}
          />
        ) : (
          <Input
            type="select"
            name="status"
            value={formData.status}
            onChange={handleChange}
            invalid={!!errors.status}
          >
            {!(currentUser?.role === 'SyndicateAdmin' && !contract) && (
              <option value="Draft">{t('contractModal.status.draft')}</option>
            )}
            <option value="Active">{t('contractModal.status.active')}</option>
            <option value="Expired">{t('contractModal.status.expired')}</option>
            <option value="Terminated">{t('contractModal.status.terminated')}</option>
          </Input>
        )}
      </div>

      <div className="d-flex justify-content-end gap-2">
        {!inlineModal && (
          <Button color="secondary" onClick={toggle}>
            {isReadOnly ? t('contractModal.form.close') : t('contractModal.form.cancel')}
          </Button>
        )}
        {!isReadOnly && (
          <Button color="primary" type="submit">
            {contract ? t('contractModal.form.update') : t('contractModal.form.save')}
          </Button>
        )}
      </div>
    </Form>
  );

  if (inlineModal) {
    return renderModalContent();
  }
  return (
    <Modal isOpen={isOpen} toggle={toggle} onClosed={onClosed}>
      <ModalHeader toggle={toggle}>
        {isReadOnly ? t('contractModal.viewContract') : (contract ? t('contractModal.editContract') : t('contractModal.addContract'))}
      </ModalHeader>
      <ModalBody>
        {renderModalContent()}
      </ModalBody>
    </Modal>
  );
};

export default withTranslation()(ContractModal);