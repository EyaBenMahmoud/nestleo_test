import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import api from "../../services/api";

const CoownerSubscriptionExpired = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.Loginn || {});
  const [adminContacts, setAdminContacts] = useState([]);

  // Fetch admins of buildings the co-owner belongs to
  useEffect(() => {
    const fetchBuildingAdmins = async () => {
      try {
        if (user?.role === "SyndicateCoowner") {
          const response = await api.get('/api/Building/my-admins');
          setAdminContacts(response.data);
        }
      } catch (error) {
        console.error("Error fetching building admins:", error);
      }
    };

    fetchBuildingAdmins();
  }, [user]);

  return (
    <div className="subscription-expired-page py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardBody className="p-4">
                <div className="text-center mb-4">
                  <div className="avatar-md mx-auto mb-4">
                    <div className="avatar-title bg-light rounded-circle text-primary fs-24">
                      <i className="ri-alarm-warning-line"></i>
                    </div>
                  </div>
                  <h4 className="text-primary">{t("subscription.accessRestricted")}</h4>
                  <p className="text-muted mb-4">
                    {t("subscription.coownerRestrictionMessage")}
                  </p>
                </div>

                <div className="mt-4">
                  <h5>{t("subscription.yourBuildingAdmins")}:</h5>
                  {adminContacts.length > 0 ? (
                    <div className="admin-list mt-3">
                      {adminContacts.map((admin, index) => (
                        <div key={index} className="admin-item d-flex align-items-center p-3 bg-light rounded mb-2">
                          <div className="avatar-xs me-3">
                            <div className="avatar-title bg-primary rounded-circle">
                              {admin.firstName?.charAt(0)}{admin.lastName?.charAt(0)}
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{`${admin.firstName} ${admin.lastName}`}</h6>
                            <p className="mb-0 text-muted small">
                              {admin.email} {admin.phoneNumber && `• ${admin.phoneNumber}`}
                            </p>
                            <p className="mb-0 text-muted small">{t("subscription.forBuilding")}: {admin.buildingName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">{t("subscription.noAdminsFound")}</p>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <p>{t("subscription.pleaseContactAdmin")}</p>
                  <div className="mt-4">
                    <Link to="/landing" className="btn btn-primary">
                      {t("subscription.backToHome")}
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CoownerSubscriptionExpired;