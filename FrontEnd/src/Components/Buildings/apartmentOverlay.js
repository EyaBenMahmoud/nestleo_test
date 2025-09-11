import React from 'react';
import { Card, CardBody, CardTitle, Badge, Button, Row, Col } from 'reactstrap';
import { 
  FaHome, FaRulerVertical, FaLayerGroup, FaBed, FaExpandArrowsAlt, 
  FaUserTie, FaUser, FaPhoneAlt, FaEnvelope, FaEdit, FaMoneyBillWave
} from 'react-icons/fa';
import { withTranslation } from "react-i18next";

const ApartmentDetailOverlay = ({ apartment, onClose, onEdit, isAdmin, t }) => {
  if (!apartment) return null;

  return (
    <div className="apartment-detail-overlay">
      <Card className="border-0 shadow">
        <div className="card-header-custom bg-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaHome className="me-2 fs-4" />
            <h5 className="mb-0">Apartment #{apartment.number}</h5>
          </div>
          <div>
            <Badge color={apartment.coOwner ? "success" : "warning"} className="ms-2">
              {apartment.coOwner ? t('apartmentOverlay.occupied') : t('apartmentOverlay.available')}
            </Badge>
            <Button close onClick={onClose} className="text-white ms-2" />
          </div>
        </div>
        <CardBody>
          <Row className="g-3">
            <Col md="6">
              <div className="apartment-detail-section">
                <h6 className="section-title">
                  <FaHome className="icon-primary me-2" /> {t('apartmentOverlay.basicInformation')}
                </h6>
                <div className="detail-item">
                  <span className="detail-label">
                    <FaRulerVertical className="icon-muted me-2" /> {t('apartmentOverlay.floor')}
                  </span>
                  <span className="detail-value">{apartment.floor}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">
                    <FaLayerGroup className="icon-muted me-2" /> {t('apartmentOverlay.bloc')}
                  </span>
                  <span className="detail-value">
                    {apartment.bloc?.name || 
                      (Array.isArray(apartment.building?.blocs) && 
                       apartment.building.blocs.length > 0 ? 
                       apartment.building.blocs[0].name : t('apartmentOverlay.na'))}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">
                    <FaBed className="icon-muted me-2" /> {t('apartmentOverlay.bedrooms')}
                  </span>
                  <span className="detail-value">{apartment.bedrooms || t('apartmentOverlay.na')}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    <FaExpandArrowsAlt className="icon-muted me-2" /> {t('apartmentOverlay.size')}
                  </span>
                  <span className="detail-value">{apartment.size ? `${apartment.size} m²` : t('apartmentOverlay.na')}</span>
                </div>
              </div>
            </Col>
            
            <Col md="6">
              {apartment.coOwner ? (
                <div className="apartment-detail-section">
                  <h6 className="section-title">
                    <FaUserTie className="icon-success me-2" /> {t('apartmentOverlay.ownerInformation')}
                  </h6>
                  <div className="detail-item">
                    <span className="detail-label">
                      <FaUser className="icon-muted me-2" /> {t('apartmentOverlay.name')}
                    </span>
                    <span className="detail-value">{`${apartment.coOwner.firstName || ''} ${apartment.coOwner.lastName || ''}`}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">
                      <FaPhoneAlt className="icon-muted me-2" /> {t('apartmentOverlay.phone')}
                    </span>
                    <span className="detail-value">
                      {apartment.coOwner.phone || t('apartmentOverlay.na')}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">
                      <FaEnvelope className="icon-muted me-2" /> {t('apartmentOverlay.email')}
                    </span>
                    <span className="detail-value">
                      {apartment.coOwner.email || t('apartmentOverlay.na')}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">
                      <FaMoneyBillWave className="icon-muted me-2" /> {t('apartmentOverlay.paymentStatus')}
                    </span>
                    <Badge color={apartment.paymentStatus === 'Paid' ? 'success' : 'warning'}>
                      {apartment.paymentStatus || t('apartmentOverlay.na')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="apartment-detail-section">
                  <h6 className="section-title text-warning">
                    <FaUserTie className="me-2" /> {t('apartmentOverlay.noOwnerAssigned')}
                  </h6>
                  <p className="text-muted mb-0">
                    {t('apartmentOverlay.apartmentAvailable')}
                  </p>
                </div>
              )}
            </Col>
          </Row>

          <div className="d-flex justify-content-end mt-4">
            {isAdmin && (
              <Button color="primary" size="sm" onClick={() => onEdit(apartment)}>
                <FaEdit className="me-1" /> {t('apartmentOverlay.editApartment')}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default withTranslation()(ApartmentDetailOverlay);