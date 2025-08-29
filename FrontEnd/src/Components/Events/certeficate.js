import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Card, CardBody, Button, Alert } from 'reactstrap';

const CertificateAcceptance = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [certificateAccepted, setCertificateAccepted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isCertificateStored, setIsCertificateStored] = useState(false);
  const [userConfirmedCertificate, setUserConfirmedCertificate] = useState(false);

  // Check if certificate was already accepted (from localStorage)
  useEffect(() => {
    const isAccepted = localStorage.getItem('jitsi-certificate-accepted') === 'true';
    setIsCertificateStored(isAccepted);
    
    // Even if it was previously accepted, we still need to confirm with the user
    // Don't auto-redirect here - we'll ask the user first
  }, []);

  // Function to test if certificate is working (hidden iframe test)
  const testCertificate = () => {
    const testFrame = document.createElement('iframe');
    testFrame.style.display = 'none';
    testFrame.src = 'https://51.68.188.157:8443/';
    
    const timeout = setTimeout(() => {
      if (document.body.contains(testFrame)) {
        document.body.removeChild(testFrame);
      }
      // Certificate not working, show instructions
      setShowInstructions(true);
    }, 5000);
    
    testFrame.onload = () => {
      console.log('Certificate test successful!');
      clearTimeout(timeout);
      if (document.body.contains(testFrame)) {
        document.body.removeChild(testFrame);
      }
      // Mark as accepted
      localStorage.setItem('jitsi-certificate-accepted', 'true');
      setCertificateAccepted(true);
      
      // Wait before redirecting to show success message
      setTimeout(() => {
        navigate(`/meeting/${eventId}`);
      }, 1500);
    };
    
    testFrame.onerror = () => {
      clearTimeout(timeout);
      if (document.body.contains(testFrame)) {
        document.body.removeChild(testFrame);
      }
      setShowInstructions(true);
    };
    
    document.body.appendChild(testFrame);
  };

  const handleOpenServer = () => {
    window.open('https://51.68.188.157:8443/', '_blank');
  };

  const handleManualContinue = () => {
    // Mark certificate as accepted manually
    localStorage.setItem('jitsi-certificate-accepted', 'true');
    navigate(`/meeting/${eventId}`);
  };

  const handleRecheckCertificate = () => {
    setShowInstructions(false);
    testCertificate();
  };
  
  // When user confirms they've already done this before
  const handleConfirmPreviousAcceptance = () => {
    setUserConfirmedCertificate(true);
    setTimeout(() => {
      navigate(`/meeting/${eventId}`);
    }, 1000);
  };

  // For users who need to redo the process
  const handleRedoProcess = () => {
    setIsCertificateStored(false);
    setShowInstructions(true);
  };

  // If user has previously accepted certificate, ask for confirmation
  if (isCertificateStored && !userConfirmedCertificate) {
    return (
      <Container fluid className="py-5" style={{ marginTop: '80px' }}>
        <Card className="nestly-card text-center">
          <CardBody className="py-4">
            <div className="nestly-icon-container nestly-icon-container-teal mx-auto mb-3">
              <i className="ri-shield-line fs-1"></i>
            </div>
            <h4 className="poll-title mb-3">Security Certificate Check</h4>
            <p className="text-muted mb-4">
              You have previously accepted the meeting server's security certificate.
              <br />
              Have you already completed the certificate acceptance steps in this browser?
            </p>
            
            <div className="d-flex justify-content-center gap-3">
              <Button
                color="success"
                className="nestly-btn-teal"
                onClick={handleConfirmPreviousAcceptance}
              >
                <i className="ri-check-line me-2"></i>
                Yes, I've already accepted it
              </Button>
              <Button
                color="warning" 
                className="nestly-btn-coral"
                onClick={handleRedoProcess}
              >
                <i className="ri-refresh-line me-2"></i>
                No, show me the steps again
              </Button>
            </div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  // Show success message if certificate was just accepted
  if (certificateAccepted) {
    return (
      <Container fluid className="py-5" style={{ marginTop: '80px' }}>
        <Card className="nestly-card text-center">
          <CardBody className="py-4">
            <div className="nestly-icon-container nestly-icon-container-teal mx-auto mb-3">
              <i className="ri-check-line fs-1"></i>
            </div>
            <h4 className="poll-title mb-3">Certificate Successfully Accepted!</h4>
            <p className="text-muted mb-4">
              Redirecting you to the meeting...
            </p>
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  // Show instructions if certificate needs to be accepted
  return (
    <Container fluid className="py-5" style={{ marginTop: '80px' }}>
      <Card className="nestly-card text-center">
        <CardBody className="py-4">
          <div className="nestly-icon-container nestly-icon-container-coral mx-auto mb-3">
            <i className="ri-shield-line fs-1"></i>
          </div>
          <h4 className="poll-title mb-3">Security Certificate Setup</h4>
          <p className="text-muted mb-4">
            To join the meeting, you need to accept the meeting server's security certificate.
            <br />
            <small className="text-info">This step only needs to be done once per browser.</small>
          </p>
          
          {showInstructions && (
            <>
              <Alert color="info" className="mb-4">
                <strong>Step 1:</strong> Click the button below to open the meeting server
              </Alert>
              
              <Button
                className="nestly-btn-coral mb-3"
                onClick={handleOpenServer}
              >
                <i className="ri-external-link-line me-2"></i>
                Open Meeting Server
              </Button>
              
              <Alert color="warning" className="mb-4">
                <strong>Step 2:</strong> In the new tab, click "Advanced" → "Proceed to 51.68.188.157:8443 (unsafe)"
              </Alert>
              
              <Alert color="success" className="mb-4">
                <strong>Step 3:</strong> Once you see the Jitsi page, come back and click one of the buttons below
              </Alert>
              
              <div className="d-flex flex-column gap-2 align-items-center">
                <Button
                  className="nestly-btn-outline-teal"
                  onClick={handleRecheckCertificate}
                >
                  <i className="ri-refresh-line me-2"></i>
                  Check Certificate Again
                </Button>
                
                <Button
                  className="nestly-btn-teal"
                  onClick={handleManualContinue}
                >
                  <i className="ri-arrow-right-line me-2"></i>
                  Continue to Meeting
                </Button>
              </div>
            </>
          )}
          
          {!showInstructions && (
            <div className="d-flex justify-content-center align-items-center">
              <div className="spinner-border text-primary me-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="text-muted">Testing certificate...</span>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  );
};

export default CertificateAcceptance;
