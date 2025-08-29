import React, { useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container, Row, Col, Card, CardBody, CardTitle, 
  Button, Badge, UncontrolledTooltip
} from 'reactstrap';
import BreadCrumb from '../Common/BreadCrumb';
import { fetchBuildingById } from '../../slices/buildings/building';
import { FaLayerGroup, FaHome, FaUsers, FaChevronLeft, FaSearch, FaExpand } from 'react-icons/fa';
import PropertyNavigation from './tabnavigarion';
import buildingImage from "../../assets/images/office-building.png";
import ApartmentDetailOverlay from './apartmentOverlay';

const BuildingVisualization = ({ buildingId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredApartment, setHoveredApartment] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const user = useSelector((state) => state.Profile.user);
  const isAdmin = user?.role === 'SyndicateAdmin';
  
  const selectedBuilding = useSelector((state) => state.Building.selectedBuilding?.building);
  const loading = useSelector((state) => state.Building.loading);
  
  // Get total statistics
  const totalApartments = useMemo(() => {
    if (!selectedBuilding || !selectedBuilding.blocs) return 0;
    return selectedBuilding.blocs.reduce((total, bloc) => 
      total + (bloc.apartments?.length || 0), 0);
  }, [selectedBuilding]);
  
  const occupiedApartments = useMemo(() => {
    if (!selectedBuilding || !selectedBuilding.blocs) return 0;
    return selectedBuilding.blocs.reduce((total, bloc) => 
      total + (bloc.apartments?.filter(apt => apt.coOwner)?.length || 0), 0);
  }, [selectedBuilding]);
  
  // Calculate colors based on apartment status
  const getApartmentColor = (apartment) => {
    if (hoveredApartment && hoveredApartment._id === apartment._id) {
      return apartment.coOwner ? '#2980b9' : '#c0392b';
    }
    return apartment.coOwner ? '#3498db' : '#e74c3c';
  };
  
  const getApartmentText = (apartment) => {
    return `#${apartment.number}`;
  };
  
  // Load building data if needed
  useEffect(() => {
    if (buildingId) {
      dispatch(fetchBuildingById(buildingId));
    }
    
    // Resize stage based on window size
    const handleResize = () => {
      const container = document.getElementById('visualization-container');
      if (container) {
        setStageSize({
          width: container.offsetWidth,
          height: Math.max(500, container.offsetWidth * 0.5)
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch, buildingId]);
  
  const handleApartmentClick = (apartment) => {
    setSelectedApartment(apartment);
  };
  
  const handleApartmentHover = (apartment) => {
    setHoveredApartment(apartment);
  };
  
  const handleEditApartment = (apartment) => {
    setShowEditModal(true);
    // You can implement the edit modal logic here or reuse your existing modal
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
  };
  
  // Building layout component
  const generateLayout = () => {
    if (!selectedBuilding || !selectedBuilding.blocs) return null;
    
    const blocs = selectedBuilding.blocs;
    const blocCount = blocs.length;
    
    // Calculate dimensions
    const padding = 20;
    const buildingWidth = (stageSize.width / zoomLevel) - (2 * padding);
    const buildingHeight = (stageSize.height / zoomLevel) - (2 * padding);
    
    // Calculate bloc dimensions
    const blocWidth = (buildingWidth / blocCount) - padding;
    
    return (
      <Layer scaleX={zoomLevel} scaleY={zoomLevel}>
        {/* Building outline */}
        <Rect
          x={padding}
          y={padding}
          width={buildingWidth}
          height={buildingHeight}
          fill="#f8f9fa"
          stroke="#607D8B"
          strokeWidth={2}
          cornerRadius={8}
        />
        
        {/* Building name */}
        <Text
          x={padding + 10}
          y={padding + 10}
          text={selectedBuilding.name || 'Building'}
          fontSize={18}
          fontStyle="bold"
          fill="#455a64"
        />
        
        {/* Render blocs */}
        {blocs.map((bloc, blocIndex) => {
          const blocX = padding + (blocIndex * (blocWidth + padding));
          const blocY = padding + 40;
          const blocHeight = buildingHeight - 50;
          
          return (
            <Group key={bloc._id || blocIndex}>
              {/* Bloc container */}
              <Rect
                x={blocX}
                y={blocY}
                width={blocWidth}
                height={blocHeight}
                fill="#ecf0f1"
                stroke="#90a4ae"
                strokeWidth={1.5}
                cornerRadius={5}
              />
              
              {/* Bloc name */}
              <Text
                x={blocX + 10}
                y={blocY + 10}
                text={bloc.name || `Bloc ${blocIndex + 1}`}
                fontSize={14}
                fontStyle="bold"
                fill="#607D8B"
              />
              
              {/* Render apartments */}
              {bloc.apartments && bloc.apartments.map((apartment, aptIndex) => {
                // Arrange apartments vertically within each bloc
                const totalApartments = bloc.apartments.length;
                const apartmentHeight = (blocHeight - 50) / Math.max(totalApartments, 1);
                const apartmentWidth = blocWidth - 20;
                const apartmentX = blocX + 10;
                const apartmentY = blocY + 40 + (aptIndex * apartmentHeight);
                
                const isHovered = hoveredApartment && hoveredApartment._id === apartment._id;
                const isSelected = selectedApartment && selectedApartment._id === apartment._id;
                
                return (
                  <Group 
                    key={apartment._id || `apt-${blocIndex}-${aptIndex}`}
                    onClick={() => handleApartmentClick(apartment)}
                    onTap={() => handleApartmentClick(apartment)}
                    onMouseEnter={() => handleApartmentHover(apartment)}
                    onMouseLeave={() => setHoveredApartment(null)}
                  >
                    <Rect
                      x={apartmentX}
                      y={apartmentY}
                      width={apartmentWidth}
                      height={apartmentHeight - 10}
                      fill={getApartmentColor(apartment)}
                      stroke={isSelected ? "#ffffff" : isHovered ? "#f1c40f" : "#455a64"}
                      strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                      cornerRadius={5}
                      opacity={isSelected ? 1 : isHovered ? 0.95 : 0.85}
                      shadowColor="black"
                      shadowBlur={isSelected ? 6 : isHovered ? 4 : 2}
                      shadowOpacity={isSelected ? 0.4 : isHovered ? 0.3 : 0.2}
                      shadowOffset={{ x: 1, y: 1 }}
                    />
                    <Text
                      x={apartmentX + 10}
                      y={apartmentY + (apartmentHeight - 10) / 2 - 10}
                      text={getApartmentText(apartment)}
                      fontSize={12}
                      fontStyle="bold"
                      fill="white"
                      width={apartmentWidth - 20}
                      align="center"
                    />
                    <Text
                      x={apartmentX + 10}
                      y={apartmentY + (apartmentHeight - 10) / 2 + 5}
                      text={apartment.coOwner ? "Occupied" : "Available"}
                      fontSize={10}
                      fill="white"
                      width={apartmentWidth - 20}
                      align="center"
                    />
                    <Text
                      x={apartmentX + 10}
                      y={apartmentY + apartmentHeight - 25}
                      text={`Floor ${apartment.floor || '?'}`}
                      fontSize={10}
                      fill="white"
                      width={apartmentWidth - 20}
                      align="center"
                    />
                  </Group>
                );
              })}
            </Group>
          );
        })}
      </Layer>
    );
  };
  
  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Building Visualization" pageTitle="Buildings" />
          <PropertyNavigation />
          <Row>
            <Col>
              <Card>
                <CardBody className="text-center py-5">
                  <div className="d-flex justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <p className="mt-3 text-muted">Loading building visualization...</p>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
  
  if (!selectedBuilding) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Building Visualization" pageTitle="Buildings" />
          <PropertyNavigation />
          <Row>
            <Col>
              <Card>
                <CardBody className="text-center py-5">
                  <div className="d-flex justify-content-center">
                    <i className="ri-error-warning-line text-warning" style={{ fontSize: "3rem" }}></i>
                  </div>
                  <h5 className="mt-3">Building not found</h5>
                  <p className="text-muted">The requested building could not be loaded. Please check the building ID.</p>
                  <Button 
                    color="primary" 
                    className="mt-2" 
                    onClick={() => navigate('/BuildingInterface')}
                  >
                    <FaChevronLeft className="me-1" /> Return to Buildings
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content building-visualization-page">
      <Container fluid>
        <BreadCrumb title="Building Visualization" pageTitle="Buildings" />
        <PropertyNavigation />
        
        {/* Building Header */}
        <Card className="mb-4 shadow-sm border-0">
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center">
                <img
                  src={buildingImage}
                  alt="Building Icon"
                  className="me-3"
                  style={{ width: "64px", height: "64px" }}
                />
                <div>
                  <h4 className="mb-0">{selectedBuilding.name || 'Building'}</h4>
                  <p className="text-muted mb-0">
                    {selectedBuilding.address_street || ''} 
                    {selectedBuilding.address_number ? `, ${selectedBuilding.address_number}` : ''} 
                    {selectedBuilding.address_city ? `, ${selectedBuilding.address_city}` : ''}
                  </p>
                </div>
              </div>
              <Button 
                color="primary" 
                outline
                onClick={() => navigate(`/buildings/${buildingId}`)}
                className="d-flex align-items-center"
              >
                <FaChevronLeft className="me-1" /> Back to Details
              </Button>
            </div>
            
            <div className="d-flex flex-wrap gap-3 mb-0">
              <div className="bg-light rounded p-3 text-center" style={{ minWidth: "120px" }}>
                <h6 className="text-muted mb-1">Total Blocs</h6>
                <h4 className="mb-0">
                  <Badge color="info" className="p-2">
                    <FaLayerGroup className="me-1" />
                    {selectedBuilding.blocs?.length || 0}
                  </Badge>
                </h4>
              </div>
              
              <div className="bg-light rounded p-3 text-center" style={{ minWidth: "150px" }}>
                <h6 className="text-muted mb-1">Total Apartments</h6>
                <h4 className="mb-0">
                  <Badge color="info" className="p-2">
                    <FaHome className="me-1" />
                    {totalApartments}
                  </Badge>
                </h4>
              </div>
              
              <div className="bg-light rounded p-3 text-center" style={{ minWidth: "150px" }}>
                <h6 className="text-muted mb-1">Occupied/Available</h6>
                <h4 className="mb-0">
                  <Badge color="success" className="p-2 me-2">
                    {occupiedApartments}
                  </Badge>
                  <Badge color="danger" className="p-2">
                    {totalApartments - occupiedApartments}
                  </Badge>
                </h4>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {/* Visualization Card */}
        <Card className="shadow-sm border-0 mb-4">
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <CardTitle tag="h5" className="mb-0">
                <FaHome className="me-2" /> Visual Layout
              </CardTitle>
              
              <div className="d-flex align-items-center">
                <div className="me-3 d-flex align-items-center">
                  <div style={{ width: 16, height: 16, backgroundColor: '#3498db', borderRadius: 3, marginRight: 8 }}></div>
                  <span>Occupied</span>
                </div>
                <div className="me-3 d-flex align-items-center">
                  <div style={{ width: 16, height: 16, backgroundColor: '#e74c3c', borderRadius: 3, marginRight: 8 }}></div>
                  <span>Available</span>
                </div>
                
                <Button color="light" size="sm" className="ms-2" id="zoomOutBtn" onClick={handleZoomOut}>
                  <i className="ri-zoom-out-line"></i>
                </Button>
                <UncontrolledTooltip target="zoomOutBtn">
                  Zoom Out
                </UncontrolledTooltip>
                
                <Button color="light" size="sm" className="ms-1" id="zoomResetBtn" onClick={handleResetZoom}>
                  <i className="ri-refresh-line"></i>
                </Button>
                <UncontrolledTooltip target="zoomResetBtn">
                  Reset Zoom
                </UncontrolledTooltip>
                
                <Button color="light" size="sm" className="ms-1" id="zoomInBtn" onClick={handleZoomIn}>
                  <i className="ri-zoom-in-line"></i>
                </Button>
                <UncontrolledTooltip target="zoomInBtn">
                  Zoom In
                </UncontrolledTooltip>
              </div>
            </div>
            
            <div id="visualization-container" className="building-visualization-container">
              <Stage width={stageSize.width} height={stageSize.height}>
                {generateLayout()}
              </Stage>
              
              {/* Apartment Details Overlay - Show when an apartment is selected */}
              {selectedApartment && (
                <ApartmentDetailOverlay 
                  apartment={selectedApartment}
                  onClose={() => setSelectedApartment(null)}
                  onEdit={handleEditApartment}
                  isAdmin={isAdmin}
                />
              )}
            </div>
            
            {/* Hover Info Panel */}
            {hoveredApartment && !selectedApartment && (
              <div className="apartment-hover-info">
                <h6>Apartment #{hoveredApartment.number}</h6>
                <p className="mb-1">Floor: {hoveredApartment.floor || '?'}</p>
                <p className="mb-0">Status: {hoveredApartment.coOwner ? 'Occupied' : 'Available'}</p>
                <small className="text-muted">Click to view details</small>
              </div>
            )}
            
            <div className="text-muted mt-3">
              <small><FaSearch className="me-1" /> Hover over apartments for info • Click to view detailed information</small>
            </div>
          </CardBody>
        </Card>
        
        {/* CSS Styles */}
        <style jsx>{`
          .building-visualization-page {
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
          }

          .building-visualization-container {
            border: 1px solid #e9e9ef;
            border-radius: 8px;
            overflow: hidden;
            background-color: #f8f9fa;
            position: relative;
            height: ${stageSize.height}px;
          }

          .apartment-hover-info {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-width: 250px;
            z-index: 100;
            border-left: 4px solid #3498db;
          }

          .apartment-hover-info h6 {
            margin-bottom: 10px;
            color: #3498db;
          }

          .apartment-hover-info small {
            display: block;
            margin-top: 10px;
            font-style: italic;
          }
          
          .apartment-detail-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 700px;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
          }
          
          .card-header-custom {
            padding: 15px;
            border-radius: 0.25rem 0.25rem 0 0;
          }
          
          .apartment-detail-section {
            margin-bottom: 15px;
          }
          
          .section-title {
            font-size: 1rem;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
          }
          
          .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          
          .detail-label {
            color: #6c757d;
            display: flex;
            align-items: center;
          }
          
          .detail-value {
            font-weight: 600;
            color: #495057;
          }
          
          .icon-primary {
            color: #3498db;
          }
          
          .icon-success {
            color: #2ecc71;
          }
          
          .icon-muted {
            color: #95a5a6;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </Container>
    </div>
  );
};

export default BuildingVisualization;