import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    return (
        <React.Fragment>
            <footer className="footer">
                <Container fluid>
                    <Row>
                        <Col sm={6}>
                            {new Date().getFullYear()} {t('auth.footer.copyright')}
                        </Col>
                        <Col sm={6}>
                            <div className="text-sm-end d-none d-sm-block">
                            {t('auth.footer.tagline')}
                            </div>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </React.Fragment>
    );
};

export default Footer;