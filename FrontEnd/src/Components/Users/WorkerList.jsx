import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers, toggleUserStatus } from "../../slices/users/userSlice";
import DataTable from 'react-data-table-component';
import { Card, CardBody, CardHeader, Col, Container, Row } from 'reactstrap';
import StatusModal from "./statusmodal"; // Import StatusModal
import { FaBan, FaCheckCircle } from "react-icons/fa";

const WorkerList = () => {
    const dispatch = useDispatch();
    const { list = [], loading, error } = useSelector((state) => state.Userss);
    const [filterText, setFilterText] = useState('');
    const [statusModal, setStatusModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userStatus, setUserStatus] = useState(null);

    const WorkerData = list.filter(user => user.role === "Worker");
    const filteredData = WorkerData.filter(
        item =>
            item.firstName.toLowerCase().includes(filterText.toLowerCase()) ||
            item.lastName.toLowerCase().includes(filterText.toLowerCase()) ||
            item.email.toLowerCase().includes(filterText.toLowerCase())
    );

    const handleStatusToggle = (userId, isActive) => {
        setSelectedUser(userId);
        setUserStatus(isActive);
        setStatusModal(true);  // Open status modal
    };

    const handleStatusChange = () => {
        if (selectedUser) {
            dispatch(toggleUserStatus(selectedUser)).then(() => {
                dispatch(getAllUsers());  // Refresh the list
                setStatusModal(false);  // Close modal
            });
        }
    };

    // Fetch users from the backend
    const fetchUsers = useCallback(() => {
        dispatch(getAllUsers());
    }, [dispatch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const columns = [
        {
            name: <span className='font-weight-bold fs-13'>Name</span>,
            selector: row => `${row.firstName} ${row.lastName}`,
            sortable: true,
        },
        {
            name: <span className='font-weight-bold fs-13'>Email</span>,
            selector: row => row.email,
            sortable: true,
        },
        {
            name: <span className='font-weight-bold fs-13'>Role</span>,
            selector: row => row.role,
            sortable: true,
        },
        {
            name: <span className='font-weight-bold fs-13'>Status</span>,
            cell: (row) => (
                <div className="form-check form-switch d-flex align-items-center gap-2">
                <input
                    type="checkbox"
                    className="form-check-input"
                    checked={row.isActive}
                    onChange={() => handleStatusToggle(row._id, row.isActive)}
                    disabled={row.role === 'SuperAdmin'}
                />
                <label className="form-check-label d-flex align-items-center">
                    <span className={row.isActive ? "text-success" : "text-danger"}>
                        {row.isActive ? "Active" : "Inactive"}
                    </span>
                </label>
            </div>
            
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
        },
    ];

    return (
        <Container fluid style={{ marginTop: "80px" }}>
            <Row>
                <Col lg={12}>
                    <Card>
                        <CardHeader>
                            <h4 className="card-title mb-0">Worker Management</h4>
                        </CardHeader>

                        <CardBody>
                            <div className="mb-3 d-flex justify-content-between">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="form-control"
                                    style={{ maxWidth: "300px" }}
                                />
                            </div>

                            <DataTable
                                columns={columns}
                                data={filteredData}
                                pagination
                                paginationPerPage={10}
                                paginationRowsPerPageOptions={[5, 10, 20]}
                                highlightOnHover
                                responsive
                                striped
                                noDataComponent={<div className="py-4">No Worker found</div>}
                            />
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <StatusModal
                show={statusModal}
                onCloseClick={() => setStatusModal(false)}
                onConfirmClick={handleStatusChange}
                user={selectedUser ? list.find(user => user._id === selectedUser) : null}
                isActive={userStatus}
            />
        </Container>
    );
};

export default WorkerList;
