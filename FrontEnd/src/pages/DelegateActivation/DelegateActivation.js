import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, Alert, Button, Spinner } from 'reactstrap';
import axios from 'axios';

const DelegateActivation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activated, setActivated] = useState(false);

  const handleActivation = async () => {
    if (!token) {
      setError('Token d\'activation manquant');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/delegate/activate/${token}`);
      setMessage('Délégation activée avec succès ! Le propriétaire a été notifié de votre confirmation.');
      setActivated(true);
    } catch (error) {
      console.error('Error activating delegation:', error);
      if (error.response?.status === 400) {
        setError('Token d\'activation invalide ou expiré. Veuillez contacter le propriétaire pour une nouvelle invitation.');
      } else {
        setError('Erreur lors de l\'activation de la délégation. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-activate on component mount
    if (token && !loading && !activated && !error) {
      handleActivation();
    }
  }, [token]);

  return (
    <div className="auth-page-wrapper pt-5">
      <div className="auth-one-bg-position auth-one-bg" id="auth-particles">
        <div className="bg-overlay"></div>
        <div className="shape">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="1440" height="120" preserveAspectRatio="none" viewBox="0 0 1440 120">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="shape-fill"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="shape-fill"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="shape-fill"></path>
          </svg>
        </div>
      </div>

      <div className="auth-page-content">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <div>
                  <a href="/dashboard" className="d-inline-block auth-logo">
                    <img src="/assets/images/logo-light.png" alt="" height="20" />
                  </a>
                </div>
                <p className="mt-3 fs-15 fw-medium">Nestleo - Gestion de Copropriété</p>
              </div>
            </Col>
          </Row>

          <Row className="justify-content-center">
            <Col md={8} lg={6} xl={5}>
              <Card className="mt-4">
                <CardBody className="p-4">
                  <div className="text-center mt-2">
                    <h5 className="text-primary">Activation de Délégation</h5>
                    <p className="text-muted">Confirmation de votre participation</p>
                  </div>
                  
                  <div className="p-2 mt-4">
                    {loading && (
                      <div className="text-center">
                        <Spinner color="primary" />
                        <p className="mt-2">Activation en cours...</p>
                      </div>
                    )}

                    {message && (
                      <Alert color="success" className="text-center">
                        <div className="d-flex align-items-center justify-content-center mb-2">
                          <i className="ri-checkbox-circle-line fs-22 me-2"></i>
                          <h6 className="mb-0">Succès !</h6>
                        </div>
                        <p className="mb-0">{message}</p>
                      </Alert>
                    )}

                    {error && (
                      <Alert color="danger" className="text-center">
                        <div className="d-flex align-items-center justify-content-center mb-2">
                          <i className="ri-error-warning-line fs-22 me-2"></i>
                          <h6 className="mb-0">Erreur</h6>
                        </div>
                        <p className="mb-0">{error}</p>
                      </Alert>
                    )}

                    {!loading && (
                      <div className="text-center mt-4">
                        {activated ? (
                          <div>
                            <p className="text-muted mb-3">
                              Votre délégation a été activée. Vous recevrez désormais les invitations aux réunions à la place du propriétaire.
                            </p>
                            <Button 
                              color="primary" 
                              onClick={() => navigate('/dashboard')}
                              className="w-100"
                            >
                              Retour au tableau de bord
                            </Button>
                          </div>
                        ) : error ? (
                          <div>
                            <p className="text-muted mb-3">
                              Si vous continuez à rencontrer des problèmes, veuillez contacter le propriétaire qui vous a invité.
                            </p>
                            <Button 
                              color="secondary" 
                              onClick={() => navigate('/dashboard')}
                              className="w-100"
                            >
                              Retour au tableau de bord
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-muted mb-3">
                              Cliquez sur le bouton ci-dessous pour confirmer votre participation en tant que délégué.
                            </p>
                            <Button 
                              color="primary" 
                              onClick={handleActivation}
                              className="w-100"
                              disabled={loading}
                            >
                              Activer ma délégation
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              <div className="mt-4 text-center">
                <p className="mb-0 text-white-50">
                  Besoin d'aide ? {" "}
                  <a href="/contact" className="text-primary text-decoration-underline fw-medium">
                    Contactez-nous
                  </a>
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default DelegateActivation;
