import React, { useEffect, useState } from "react";
import { getContract, getArchivedContracts, archiveContract, deleteContract } from "../../services/contractservice";
import { 
  Button, Card, CardBody, CardHeader, Col, Container, Row, 
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Input, Badge, Modal, ModalBody, Alert
} from "reactstrap";
import DataTable from 'react-data-table-component';
import ContractModal from "./ContractModal";
import DeleteModal from "../Common/DeleteModal";
import { useSelector } from "react-redux";
import Loader from "../Common/Loader";
import { withTranslation } from 'react-i18next';

const ContractList = ({ t }) => {
  const [contracts, setContracts] = useState([]);
  const [archivedContracts, setArchivedContracts] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [actionType, setActionType] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [viewMode, setViewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useSelector((state) => state.Loginn || {});
  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    fetchContracts();
    fetchArchivedContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContract();
      
      let data;
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (Array.isArray(response.contracts)) {
          data = response.contracts;
        } else {
          console.error("Expected array for contracts, received:", typeof response, response);
          data = [];
        }
      } else {
        console.error("Invalid response format for contracts:", response);
        data = [];
      }
      
      if (isSuperAdmin) {
        const filteredData = data.filter(contract => contract.contractType !== 'co-owner');
        setContracts(filteredData);
      } else {
        setContracts(data);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
      setError(t('contractList.errors.loadContractsFailed'));
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getArchivedContracts();
      
      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.contracts)) {
          data = response.contracts;
        } else {
          data = [];
        }
      } else {
        console.error("Invalid response format from getArchivedContracts:", response);
        data = [];
      }
      
      if (isSuperAdmin && Array.isArray(data)) {
        const filteredData = data.filter(contract => contract.contractType !== 'co-owner');
        setArchivedContracts(filteredData);
      } else {
        setArchivedContracts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching archived contracts:", error);
      setError(t('contractList.errors.loadArchivedContractsFailed'));
      setArchivedContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    setConfirmationModal(false);
    const id = selectedId;
    const type = actionType;
    setSelectedId(null);
    setActionType("");

    try {
      setLoading(true);
      if (type === "delete") {
        await deleteContract(id);
        setSuccessMessage('deleted');
      } else if (type === "archive") {
        await archiveContract(id);
        const archivedContract = contracts.find(c => c._id === id);
        setContracts(prev => prev.filter(c => c._id !== id));
        if (archivedContract) {
          setArchivedContracts(prev => [...prev, archivedContract]);
        }
        setSuccessMessage('archived');
      }
      setSuccessModal(true);
      fetchContracts();
      fetchArchivedContracts();
    } catch (error) {
      console.error(`Error ${type}ing contract:`, error);
      setError(t('contractList.errors.actionFailed', { action: type }));
    } finally {
      setLoading(false);
    }
  };

  const handleContractSave = () => {
    fetchContracts();
    fetchArchivedContracts();
    setSuccessMessage(selectedContract ? 'updated' : 'added');
    setSuccessModal(true);
    setModal(false);
    setSelectedContract(null);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Draft': return 'warning';
      case 'Expired': return 'danger';
      default: return 'secondary';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'co-owner': return 'info';
      case 'maintenance': return 'primary';
      case 'service': return 'purple';
      default: return 'secondary';
    }
  };

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>{t('contractList.columns.contractNumber')}</span>,
      selector: row => row.contractNumber,
      sortable: true,
      cell: row => (
        <div>
          <h5 className="fs-14 mb-0">{row.contractNumber}</h5>
          <p className="text-muted mb-0 fs-12">
            {new Intl.DateTimeFormat('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }).format(new Date(row.createdAt || row.startDate))}
          </p>
        </div>
      )
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contractList.columns.title')}</span>,
      selector: row => row.title,
      sortable: true,
      cell: row => (
        <div style={{maxWidth: "200px"}}>
          <div className="d-flex align-items-center">
            <div className="avatar-xs me-2 flex-shrink-0">
              <div className={`avatar-title rounded-circle bg-soft-${getTypeBadgeColor(row.contractType)} text-${getTypeBadgeColor(row.contractType)} fs-lg`}>
                <i className={row.contractType === 'co-owner' ? 'ri-home-4-line' : 
                              row.contractType === 'maintenance' ? 'ri-tools-line' : 
                              'ri-file-list-3-line'}></i>
              </div>
            </div>
            <div>
              <h5 className="fs-14 mb-0 text-truncate" style={{maxWidth: "150px"}} title={row.title}>{row.title}</h5>
              <p className="text-muted mb-0 fs-12">{t(`contractList.contractTypes.${row.contractType?.toLowerCase() || 'standard'}`, { defaultValue: row.contractType || 'Standard' })}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contractList.columns.status')}</span>,
      selector: row => row.status,
      cell: row => (
        <Badge color={getStatusBadgeColor(row.status)} className="px-2 py-1 fs-12">
          {t(`contractList.status.${row.status.toLowerCase()}`, { defaultValue: row.status })}
        </Badge>
      ),
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contractList.columns.duration')}</span>,
      cell: row => {
        const startDate = new Date(row.startDate);
        const endDate = new Date(row.endDate);
        return (
          <div>
            <p className="text-muted mb-0 fs-12">{t('contractList.duration.start')}: {startDate.toLocaleDateString()}</p>
            <p className="text-muted mb-0 fs-12">{t('contractList.duration.end')}: {endDate.toLocaleDateString()}</p>
          </div>
        );
      },
      sortable: false,
      width: '140px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contractList.columns.signedBy')}</span>,
      selector: row => `${row.signedBy?.email || 'N/A'}`,
      sortable: true,
      cell: row => (
        <div>
          {row.signedBy ? (
            <>
              <h5 className="fs-14 mb-0">{row.signedBy.firstName} {row.signedBy.lastName}</h5>
              <p className="text-muted mb-0 fs-12">{row.signedBy.email}</p>
            </>
          ) : (
            <Badge color="light" className="px-2 py-1 fs-12">{t('contractList.signedBy.notSigned')}</Badge>
          )}
        </div>
      ),
      width: '180px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contractList.columns.actions')}</span>,
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button 
            color="soft-primary" 
            className="btn-icon btn-sm" 
            onClick={() => {
              setViewMode(true);
              setSelectedContract(row);
              setModal(true);
            }}
          >
            <i className="ri-eye-line"></i>
          </Button>
          <Button 
            color="soft-warning" 
            className="btn-icon btn-sm"
            onClick={() => {
              setViewMode(false);
              setSelectedContract(row);
              setModal(true);
            }}
          >
            <i className="ri-pencil-line"></i>
          </Button>
          {showArchived ? (
            <Button 
              color="soft-danger" 
              className="btn-icon btn-sm"
              onClick={() => { 
                setActionType("delete");
                setSelectedId(row._id);
                setConfirmationModal(true);
              }}
            >
              <i className="ri-delete-bin-line"></i>
            </Button>
          ) : (
            <Button 
              color="soft-secondary" 
              className="btn-icon btn-sm"
              onClick={() => { 
                setActionType("archive");
                setSelectedId(row._id);
                setConfirmationModal(true);
              }}
            >
              <i className="ri-archive-line"></i>
            </Button>
          )}
        </div>
      ),
      width: '140px',
      center: true
    },
  ];

  const filteredData = showArchived 
    ? archivedContracts.filter(contract => 
        contract.contractNumber?.toLowerCase().includes(filterText.toLowerCase()) ||
        contract.title?.toLowerCase().includes(filterText.toLowerCase())
      )
    : contracts.filter(contract => 
        contract.contractNumber?.toLowerCase().includes(filterText.toLowerCase()) ||
        contract.title?.toLowerCase().includes(filterText.toLowerCase())
      );

  const contractStats = {
    active: contracts.filter(c => c.status === 'Active').length,
    draft: contracts.filter(c => c.status === 'Draft').length,
    expired: contracts.filter(c => c.status === 'Expired').length,
    archived: archivedContracts.length
  };

  const customStyles = {
    table: {
      style: {
        minWidth: '100%',
      },
    },
    headRow: {
      style: {
        backgroundColor: '#f8f9fa',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#e9ecef',
      },
    },
    rows: {
      style: {
        fontSize: '14px',
        minHeight: '60px',
        '&:not(:last-of-type)': {
          borderBottomStyle: 'solid',
          borderBottomWidth: '1px',
          borderBottomColor: '#f1f1f1',
        },
      },
      highlightOnHoverStyle: {
        backgroundColor: 'rgba(230, 72, 92, 0.04)',
        cursor: 'pointer',
      },
    },
  };

  return (
    <Container fluid style={{ marginTop: "90px" }}>
      
      {/* Welcome Card with Statistics Badges */}
      <Row className="mb-4">
        <Col>
          <Card className="welcome-card overflow-hidden">
            <div className="position-absolute end-0 start-0 top-0 z-0"
                style={{ height: '100%', background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
              <div className="position-absolute end-0 top-0 z-0">
                <svg width="250" height="250" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-25">
                  <path fill="#4B79CF" d="M44.3,-76.4C58.6,-69.7,72.2,-59.3,79.6,-45.3C87,-31.2,88.3,-13.5,85.2,2.7C82.1,19,74.7,33.8,64.7,45.9C54.8,58,42.3,67.4,28.4,72.7C14.5,78,0.1,79.2,-15,77.4C-30.1,75.7,-46,71.1,-59.6,61.6C-73.2,52.2,-84.6,38,-86.2,23C-87.8,8.1,-79.6,-7.6,-74.1,-24.6C-68.5,-41.6,-65.5,-59.8,-54.8,-69.7C-44.1,-79.7,-25.6,-81.4,-7.7,-79.5C10.2,-77.6,30,-83,44.3,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>
            </div>
            <CardBody className="p-4 position-relative">
              <Row className="align-items-center">
                <Col md={8}>
                  <div className="text-start">
                    <h4 className="fw-semibold mb-2">{t('contractList.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('contractList.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <i className="ri-checkbox-circle-line me-1"></i> {t('contractList.stats.activeContracts')}: {contractStats.active || 0}
                      </Badge>
                      <Badge color="warning" pill className="fs-12 py-2 px-3">
                        <i className="ri-draft-line me-1"></i> {t('contractList.stats.draftContracts')}: {contractStats.draft || 0}
                      </Badge>
                      <Badge color="danger" pill className="fs-12 py-2 px-3">
                        <i className="ri-time-line me-1"></i> {t('contractList.stats.expiredContracts')}: {contractStats.expired || 0}
                      </Badge>
                      <Badge color="purple" pill className="fs-12 py-2 px-3" style={{ background: '#f3eafe', color: '#6f42c1' }}>
                        <i className="ri-archive-line me-1"></i> {t('contractList.stats.archivedContracts')}: {contractStats.archived || 0}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={() => {
                        setViewMode(false);
                        setSelectedContract(null);
                        setModal(true);
                      }}
                      title={t('contractList.addContract')}
                    >
                      <i className="ri-add-line align-bottom me-1"></i> {t('contractList.addContract')}
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* End Welcome Card */}

      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="border-0 d-flex align-items-center justify-content-between">
              <div>
                <h5 className="card-title mb-0">
                  {showArchived ? t('contractList.archivedContracts') : t('contractList.contractList')}
                </h5>
              </div>
              <div className="card-header-pills">
                <Button 
                  color="light" 
                  className={!showArchived ? "active fw-semibold" : ""} 
                  onClick={() => setShowArchived(false)}
                >
                  <i className="ri-file-list-3-line fs-16 align-middle me-1"></i>
                  {t('contractList.active')}
                </Button>
                <Button 
                  color="light" 
                  className={showArchived ? "active fw-semibold" : ""} 
                  onClick={() => setShowArchived(true)}
                >
                  <i className="ri-archive-line fs-16 align-middle me-1"></i>
                  {t('contractList.archived')}
                </Button>
              </div>
            </CardHeader>

            <CardBody>
              {error && (
                <Alert color="danger" className="mb-3">
                  <i className="ri-error-warning-line me-2 align-middle"></i>
                  {error}
                </Alert>
              )}
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="search-box">
                  <div className="position-relative">
                    <Input
                      type="text"
                      placeholder={t('contractList.searchPlaceholder')}
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="form-control search"
                      style={{ minWidth: "250px" }}
                    />
                    <i className="ri-search-line search-icon"></i>
                  </div>
                </div>
                
                {!showArchived && (
                  <Button
                    color="primary"
                    onClick={() => {
                      setViewMode(false);
                      setSelectedContract(null);
                      setModal(true);
                    }}
                  >
                    <i className="ri-add-line me-1 align-bottom"></i>{t('contractList.addContract')}
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <Loader />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredData}
                  pagination
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[5, 10, 20, 50]}
                  highlightOnHover
                  responsive
                  striped
                  fixedHeader
                  fixedHeaderScrollHeight="500px"
                  persistTableHead
                  noDataComponent={
                    <div className="p-4 text-center">
                      <div className="avatar-md mx-auto mb-3">
                        <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                          <i className="ri-file-search-line"></i>
                        </div>
                      </div>
                      <h5>{t('contractList.noContractsFound')}</h5>
                      <p className="text-muted">
                        {showArchived 
                          ? t('contractList.noArchivedContracts')
                          : filterText 
                            ? t('contractList.adjustSearch')
                            : t('contractList.addContractPrompt')
                        }
                      </p>
                    </div>
                  }
                  customStyles={customStyles}
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <ContractModal 
        isOpen={modal}
        toggle={() => {
          setModal(!modal);
          setViewMode(false);
        }}
        onClosed={() => {
          setSelectedContract(null);
          setViewMode(false);
        }}
        contract={selectedContract}
        onSave={handleContractSave}
        readOnly={viewMode}
        viewOnly={viewMode}
        disableEditing={viewMode}
        currentUser={user}
      />

      <DeleteModal
        show={confirmationModal}
        onCloseClick={() => setConfirmationModal(false)}
        onDeleteClick={handleConfirmAction}
        title={t('contractList.confirmationModal.title', { action: t(`contractList.actions.${actionType}`) })}
        message={t('contractList.confirmationModal.message', { action: t(`contractList.actions.${actionType}`) })}
        deleteButtonLabel={t(`contractList.actions.${actionType}`)}
      />

      <Modal isOpen={successModal} toggle={() => setSuccessModal(false)} centered className="success-modal">
        <ModalBody className='text-center p-5'>
          <div className="text-end">
            <button 
              type="button" 
              onClick={() => setSuccessModal(false)} 
              className="btn-close text-end" 
              aria-label="Close"
            ></button>
          </div>
          <div className="mt-2">
            <div className="avatar-lg mx-auto">
              <div className="avatar-title rounded-circle bg-light text-success display-3">
                <i className="ri-checkbox-circle-fill"></i>
              </div>
            </div>
            <h4 className="mb-3 mt-4">{t('contractList.success.title', { action: t(`contractList.success.actions.${successMessage.toLowerCase()}`) })}</h4>
            <p className="text-muted fs-15 mb-4">
              {t('contractList.success.message', { action: t(`contractList.success.actions.${successMessage.toLowerCase()}`) })}
            </p>
            <div className="hstack gap-2 justify-content-center">
              <Button 
                color="primary" 
                onClick={() => setSuccessModal(false)}
                className="btn-sm"
              >
                {t('contractList.success.close')}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <style>
        {`
          .btn-soft-primary {
            background-color: rgba(85, 110, 230, 0.1);
            color: #556ee6;
            border: none;
          }
          .btn-soft-primary:hover {
            background-color: #556ee6;
            color: white;
          }
          .btn-soft-warning {
            background-color: rgba(241, 180, 76, 0.1);
            color: #f1b44c;
            border: none;
          }
          .btn-soft-warning:hover {
            background-color: #f1b44c;
            color: white;
          }
          .btn-soft-danger {
            background-color: rgba(244, 106, 106, 0.1);
            color: #f46a6a;
            border: none;
          }
          .btn-soft-danger:hover {
            background-color: #f46a6a;
            color: white;
          }
          .btn-soft-secondary {
            background-color: rgba(116, 120, 141, 0.1);
            color: #74788d;
            border: none;
          }
          .btn-soft-secondary:hover {
            background-color: #74788d;
            color: white;
          }
          .card-header-pills {
            display: flex;
            gap: 0.5rem;
          }
          .card-header-pills .btn.active {
            background-color: #f5f6f8;
            border-color: #ced4da;
            box-shadow: none;
          }
        `}
      </style>
    </Container>
  );
};

export default withTranslation()(ContractList);