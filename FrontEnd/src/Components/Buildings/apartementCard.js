import { Badge, Card, CardBody, CardSubtitle, CardTitle } from "reactstrap";
import { withTranslation } from "react-i18next";

const ApartmentCard = ({ apartment, t }) => {
    return (
      <Card className="mb-4 shadow-sm" style={{ minHeight: '200px' }}>
        <CardBody>
          <CardTitle tag="h5" className="d-flex justify-content-between">
            <span>Apartment #{apartment.number}</span>
            <Badge color={apartment.status === 'occupied' ? 'danger' : 'success'}>
              {apartment.status || t('apartmentCard.unknown')}
            </Badge>
          </CardTitle>
          <CardSubtitle className="mb-2 text-muted">
            {t('apartmentCard.floor')}: {apartment.floor} | {t('apartmentCard.bloc')}: {apartment.bloc?.name || t('apartmentCard.na')}
          </CardSubtitle>
          <div className="mt-3">
            <p className="mb-1">
            <strong>{t('apartmentCard.coOwner')}:</strong> {apartment.coOwner?.firstName && apartment.coOwner?.lastName 
  ? `${apartment.coOwner.firstName} ${apartment.coOwner.lastName}` 
  : t('apartmentCard.none')}            
            </p> 
          </div>
        </CardBody>
      </Card>
    );
  };

export default withTranslation()(ApartmentCard);