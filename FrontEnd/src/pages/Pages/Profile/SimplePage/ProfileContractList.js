import React, { useEffect, useState } from "react";
import { 
  getContract, 
  getArchivedContracts, 
  getContractsByUser, 
  getBuildingCoOwners, 
  archiveContract 
} from "../../../../services/contractservice";
import { 
  Button, Card, CardBody, Row, Col,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Input, Modal, ModalBody, Alert
} from "reactstrap";
import DataTable from 'react-data-table-component';
import ContractModal from "../../../../Components/ContractsSuperAdmin/ContractModal";
import DeleteModal from "../../../../Components/Common/DeleteModal";
import { useSelector } from "react-redux";
import axios from "axios";

const ProfileContractList = () => {
  const { user } = useSelector((state) => state.Loginn || {});
  const currentBuilding = useSelector(state => state.Building?.currentBuilding);
  const [contracts, setContracts] = useState([]);
  const [archivedContracts, setArchivedContracts] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userBuildings, setUserBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [coOwners, setCoOwners] = useState([]);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [contractToArchive, setContractToArchive] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user) {
      fetchContracts();
      fetchArchivedContracts();
    }
  }, [user]);

  // Effect to update selected building and fetch co-owners when currentBuilding changes
  useEffect(() => {
    if (currentBuilding && currentBuilding._id) {
      setSelectedBuilding(currentBuilding._id);
      fetchCoOwnersForBuilding(currentBuilding._id);
    }
  }, [currentBuilding]);

  const fetchCoOwnersForBuilding = async (buildingId) => {
    try {
      const response = await getBuildingCoOwners(buildingId);
      if (response.data && response.data.coOwners) {
        setCoOwners(response.data.coOwners);
      }
    } catch (error) {
      console.error("Error fetching building co-owners:", error);
      setCoOwners([]);
    }
  };

  const handleBuildingChange = async (e) => {
    const buildingId = e.target.value;
    if (buildingId) {
      setSelectedBuilding(buildingId);
      fetchCoOwnersForBuilding(buildingId);
    } else {
      setSelectedBuilding(null);
      setCoOwners([]);
    }
  };

  const handleCreateContract = () => {
    // If currentBuilding exists, use it and open modal directly
    if (currentBuilding && currentBuilding._id) {
      setSelectedBuilding(currentBuilding._id);
      fetchCoOwnersForBuilding(currentBuilding._id);
    } 
    setCreateModal(true);
  };
  
  const handleArchiveContract = async () => {
    try {
      setConfirmationModal(false);
      await archiveContract(contractToArchive._id);
      
      // Update the local state to reflect the archived contract
      setContracts(prevContracts => prevContracts.filter(
        contract => contract._id !== contractToArchive._id
      ));
      
      // Refresh the contract lists
      fetchContracts();
      fetchArchivedContracts();
      
      setSuccessMessage("Contract archived successfully");
      setSuccessModal(true);
    } catch (error) {
      console.error("Error archiving contract:", error);
      setSuccessMessage("Failed to archive contract");
      setSuccessModal(true);
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      let data = [];
      
      if (user?.id) {
        const response = await getContractsByUser(user.id);
        
        if (Array.isArray(response)) {
          data = response;
        } else if (response && response.data) {
          data = Array.isArray(response.data) ? response.data : [];
        }
      } else {
        // If no ID, fetch all and filter by email
        const response = await getContract();
        
        if (Array.isArray(response)) {
          data = response;
        } else if (response && response.data) {
          data = Array.isArray(response.data) ? response.data : [];
        }
        
        // Filter by email since we don't have ID
        if (user?.email) {
          data = data.filter(contract => 
            contract?.signedBy?.email?.toLowerCase() === user.email.toLowerCase()
          );
        }
      }
      
      // Filter to only show contracts with status === 'Active'
      data = data.filter(contract => contract.status === 'Active');
      
      setContracts(data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedContracts = async () => {
    try {
      console.log("Fetching archived contracts for profile view");
      const response = await getArchivedContracts();
      
      // Ensure consistent data format
      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && response.data) {
        data = Array.isArray(response.data) ? response.data : [];
      }
      
      console.log("Raw archived contracts:", data.length);
      
      // Filter by ID or email if ID is not available
      const filteredData = data.filter(contract => {
        const matchesById = user?._id && contract?.signedBy?._id === user._id;
        const matchesByEmail = user?.email && 
                            contract?.signedBy?.email?.toLowerCase() === user.email.toLowerCase();
        
        return (matchesById || matchesByEmail);
      });
      
      console.log("Filtered archived contracts for user:", filteredData.length);
      setArchivedContracts(filteredData);
    } catch (error) {
      console.error("Error fetching archived contracts:", error);
      setArchivedContracts([]);
    }
  };

  const handleContractSave = () => {
    fetchContracts();
    fetchArchivedContracts();
    setCreateModal(false);
    setEditModal(false);
  };

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>Contract Number</span>,
      selector: row => row.contractNumber,
      sortable: true,
    },
    {
      name: <span className='font-weight-bold fs-13'>Title</span>,
      selector: row => row.title,
      sortable: true,
    },
    {
      name: <span className='font-weight-bold fs-13'>Status</span>,
      selector: row => row.status,
      cell: row => (
        <span className={
          row.status === 'Active' ? 'text-success' : 
          row.status === 'Draft' ? 'text-warning' : 'text-danger'
        }>
          {row.status}
        </span>
      ),
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>Type</span>,
      selector: row => row.contractType,
      cell: row => (
        <span className={row.contractType === 'co-owner' ? 'text-info' : 'text-secondary'}>
          {row.contractType === 'co-owner' ? 'Co-Owner' : 'Admin'}
        </span>
      ),
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>Co-Owner</span>,
      selector: row => row.coOwner?.email || 'N/A',
      sortable: true,
    },
    {
      name: <span className='font-weight-bold fs-13'>Start Date</span>,
      selector: row => new Date(row.startDate).toLocaleDateString(),
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>End Date</span>,
      selector: row => new Date(row.endDate).toLocaleDateString(),
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>Actions</span>,
      cell: (row) => (
        <UncontrolledDropdown>
          <DropdownToggle tag="button" className="btn btn-soft-secondary btn-sm">
            <i className="ri-more-fill align-middle"></i>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={() => {
              setSelectedContract(row);
              setModal(true);
            }}>
              <i className="ri-eye-fill me-2"></i>View Details
            </DropdownItem>
            {!showArchived && 
   user?.role === 'SyndicateAdmin' && 
   row.contractType === 'co-owner' && (
    <DropdownItem onClick={() => {
      setSelectedContract(row);
      setEditModal(true);
    }}>
      <i className="ri-pencil-fill me-2"></i>Edit
    </DropdownItem>
  )}
            {!showArchived && 
             row.contractType === 'co-owner' && 
             user?.role === 'SyndicateAdmin' && (
              <DropdownItem onClick={() => {
                setContractToArchive(row);
                setConfirmationModal(true);
              }}>
                <i className="ri-archive-fill me-2"></i>Archive
              </DropdownItem>
            )}
          </DropdownMenu>
        </UncontrolledDropdown>
      ),
      width: '120px'
    },
  ];

  // Add safeguards for filtering to avoid errors
  const filteredData = showArchived 
    ? (archivedContracts || []).filter(contract => 
        contract?.contractNumber?.toString().toLowerCase().includes(filterText.toLowerCase()) ||
        contract?.title?.toString().toLowerCase().includes(filterText.toLowerCase())
      )
    : (contracts || []).filter(contract => 
        contract?.contractNumber?.toString().toLowerCase().includes(filterText.toLowerCase()) ||
        contract?.title?.toString().toLowerCase().includes(filterText.toLowerCase())
      );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
            { user.role === 'SyndicateAdmin' && (
                
          <Button 
            color={!showArchived ? "primary" : "secondary"} 
            onClick={() => setShowArchived(false)}
            size="sm"
          >
            My Active Contracts
          </Button>
          )}
          {user.role === 'SyndicateAdmin' && (
           
          <Button 
            color={showArchived ? "primary" : "secondary"} 
            onClick={() => setShowArchived(true)}
            size="sm"
          >
            Archived
          </Button>
           )}
          {/* Create Contract Button */}
                   {/* Create Contract Button */}
          {user.role === 'SyndicateAdmin' && (
          <Button 
            color="success" 
            onClick={handleCreateContract}
            size="sm"
            disabled={!currentBuilding}
          >
            Create Contract
          </Button>
          )}
        </div>
        <div className="w-25">
          <Input
            type="text"
            placeholder="Search..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading contracts...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          pagination
          paginationPerPage={5}
          paginationRowsPerPageOptions={[5, 10, 15]}
          highlightOnHover
          responsive
          striped
          noDataComponent={<div className="py-4">No contracts found</div>}
          customStyles={{
            cells: {
              style: {
                paddingTop: '8px',
                paddingBottom: '8px',
              }
            }
          }}
        />
      )}

      {/* View Contract Modal */}
      <ContractModal 
        isOpen={modal}
        toggle={() => setModal(!modal)}
        onClosed={() => setSelectedContract(null)}
        contract={selectedContract}
        readOnly={true}
        viewOnly={true} 
        currentUser={user}
        disableEditing={true} 
        hideSignedBy={true}
      />

      {/* Edit Contract Modal */}
      <ContractModal 
        isOpen={editModal}
        toggle={() => setEditModal(!editModal)}
        onClosed={() => setSelectedContract(null)}
        onSave={handleContractSave}
        contract={selectedContract}
        currentUser={user}
        preselectedUsers={coOwners}
        isBuildingContract={selectedContract?.contractType === 'co-owner'}
        buildingId={selectedContract?.building?._id}
        hideSignedBy={true}
      />

      {/* Create Contract Modal */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(!createModal)}>
        <div className="modal-header">
          <h5 className="modal-title">
            {currentBuilding 
              ? `Create Contract for ${currentBuilding.name}`
              : "Create Contract with Co-Owner"
            }
          </h5>
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setCreateModal(false)}
          ></button>
        </div>
        <ModalBody>
          {!currentBuilding ? (
            <div className="mb-3">
              <label className="form-label">Select Building</label>
              <select 
                className="form-select" 
                onChange={handleBuildingChange}
                value={selectedBuilding || ""}
              >
                <option value="">Select a building</option>
                {userBuildings.map(building => (
                  <option key={building._id} value={building._id}>
                    {building.name} - {building.address_street}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Alert color="info" className="mb-3">
              Creating contract for building: <strong>{currentBuilding.name}</strong> - {currentBuilding.address_street}
            </Alert>
          )}

          {selectedBuilding && (
            <ContractModal
              isOpen={true}
              toggle={() => setCreateModal(!createModal)}
              onSave={handleContractSave}
              currentUser={user}
              preselectedUsers={coOwners}
              isBuildingContract={true}
              buildingId={selectedBuilding}
              inlineModal={true} // This tells the component it's being rendered inline
              hideSignedBy={true} // Hide the signedBy field
            />
          )}
        </ModalBody>
      </Modal>

      {/* Archive Confirmation Modal */}
      <DeleteModal
        show={confirmationModal}
        onCloseClick={() => setConfirmationModal(false)}
        onDeleteClick={handleArchiveContract}
        title="Archive Contract"
        message="Are you sure you want to archive this contract? Archived contracts can still be viewed but cannot be modified."
        deleteButtonLabel="Archive"
      />

      {/* Success Modal */}
      <Modal isOpen={successModal} toggle={() => setSuccessModal(false)} centered>
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
            <lord-icon
              src="https://cdn.lordicon.com/tqywkdcz.json"
              trigger="hover"
              style={{ width: "150px", height: "150px" }}
            ></lord-icon>
            <h4 className="mb-3 mt-4">Success</h4>
            <p className="text-muted fs-15 mb-4">
              {successMessage}
            </p>
            <div className="hstack gap-2 justify-content-center">
              <button 
                className="btn btn-primary" 
                onClick={() => setSuccessModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default ProfileContractList;