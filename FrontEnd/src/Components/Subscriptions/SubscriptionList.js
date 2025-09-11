import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import DataTable from 'react-data-table-component';
import { 
  Card, CardHeader, CardBody, Container, Row, Col, 
  Button, UncontrolledDropdown, DropdownToggle, DropdownMenu, 
  DropdownItem, Popover, PopoverHeader, PopoverBody, Input,
  Badge
} from 'reactstrap';
import { getSubscriptions, getSubscriptionsfront, deleteSubscription } from '../../services/subscriptionservice';
import SubscriptionModal from './SubscriptionModal';
import DeleteModal from '../Common/DeleteModal';
import { useSubscriptionTranslations } from '../../utils/subscriptionTranslations';

const SubscriptionList = () => {
  const { t } = useTranslation();
  const { translateFeatureName, translateSubscriptionType, translateInterval } = useSubscriptionTranslations();
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]); // Store all subscriptions for admin view
  const [filterText, setFilterText] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [modal, setModal] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // Get current user language
  const currentLang = useSelector(state => state.assistantConfig?.currentLanguage) || 
                     localStorage.getItem("I18N_LANGUAGE") || "en";

  // Language options for filtering
  const languageOptions = [
    { value: 'all', label: 'All Languages' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'sp', label: 'Español' },
    { value: 'it', label: 'Italiano' }
  ];

  useEffect(() => {
    // Initialize with current language
    setSelectedLanguage(currentLang);
    loadSubscriptions();
  }, [currentLang]);

  useEffect(() => {
    // Reload subscriptions when language filter changes
    loadSubscriptions();
  }, [selectedLanguage, showAllLanguages]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      let response;
      
      if (showAllLanguages || selectedLanguage === 'all') {
        // Load all subscriptions for admin view
        response = await getSubscriptions();
        setAllSubscriptions(response.data || response);
        setSubscriptions(response.data || response);
      } else {
        // Load subscriptions for specific language
        response = await getSubscriptionsfront(selectedLanguage);
        const subscriptionData = response.data?.subscriptions || response.subscriptions || [];
        setSubscriptions(subscriptionData);
        setAllSubscriptions(subscriptionData);
      }
      
      setError(null);
    } catch (error) {
      setError(error.message);
      setSubscriptions([]);
      setAllSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = subscriptions.filter(
    item => item.subscriptionType?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleDelete = async () => {
    if (selectedSubscription) {
      try {
        await deleteSubscription(selectedSubscription._id);
        await loadSubscriptions();
        setDeleteModalVisible(false);
      } catch (error) {
        console.error('Delete failed:', error);
        setError('Failed to delete subscription.');
      }
    }
  };

  const handleMouseEnter = (id) => {
    clearTimeout(hoverTimeout);
    setPopoverOpen(id);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setPopoverOpen(null);
    }, 300);
    setHoverTimeout(timeout);
  };

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>{t('subscriptions.subscriptionType')}</span>,
      selector: row => translateSubscriptionType(row.subscriptionType),
      sortable: true,
      minWidth: '10px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('subscriptions.description')}</span>,
      cell: row => (
        <div 
          className="text-wrap" 
          style={{ 
            minWidth: '300px',
            maxWidth: '400px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}
        >
          {row.description || 'N/A'}
        </div>
      ),
      sortable: true,
      wrap: true,
      minWidth: '300px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('subscriptions.price')}</span>,
      selector: row => `$${row.price?.toFixed(2) || '0.00'}`,
      sortable: true,
      right: true,
      width: '100px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('subscriptions.interval')}</span>,
      selector: row => translateInterval(row.interval),
      cell: row => (
        <span className={row.interval === 'Active' ? 'text-success' : 'text-danger'}>
          {translateInterval(row.interval)}
        </span>
      ),
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>Language</span>,
      selector: row => row.language || 'en',
      cell: row => {
        const lang = row.language || 'en';
        const langOption = languageOptions.find(l => l.value === lang);
        return (
          <span className="badge bg-secondary">
            {langOption?.label || lang.toUpperCase()}
          </span>
        );
      },
      sortable: true,
      width: '100px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('subscriptions.features')}</span>,
      cell: row => (
        <div 
          onMouseEnter={() => handleMouseEnter(row._id)}
          onMouseLeave={handleMouseLeave}
        >
          <Button 
            color="link" 
            id={`feature-${row._id}`} 
            className="p-0"
          >
            {row.features?.length || 0} {t('subscriptions.features')}
          </Button>
          <Popover
            placement="left"
            isOpen={popoverOpen === row._id}
            target={`feature-${row._id}`}
            toggle={() => setPopoverOpen(null)}
            onMouseEnter={() => handleMouseEnter(row._id)}
            onMouseLeave={handleMouseLeave}
          >
            <PopoverHeader>{t('subscriptions.featuresList')}</PopoverHeader>
            <PopoverBody>
  <ul className="mb-0">
    {row.features?.map((feature, index) => {
      // Extract the feature base name and value for better display
      const [baseName, rawValue] = feature.name.split(':').map(str => str.trim());
      
      // Translate the feature name
      const translatedFeatureName = translateFeatureName(feature.name);
      
      // Format the value - show "Illimité" for special values
      let displayValue = rawValue;
      if (rawValue === "0" || rawValue === "-1" || rawValue?.toLowerCase() === "illimité") {
        displayValue = t('unlimited') || "Unlimited";
      }
      
      return (
        <li key={index}>
          <strong>{translatedFeatureName.split(':')[0]}:</strong> {displayValue} 
          <span className={feature.isActive ? "text-success" : "text-muted"}>
            {feature.isActive ? ` (${t('active') || 'Active'})` : ` (${t('inactive') || 'Inactive'})`}
          </span>
        </li>
      );
    })}
  </ul>
</PopoverBody>
          </Popover>
        </div>
      ),
      width: '150px'
    },
  {
      name: <span className='font-weight-bold fs-13'>{t('subscriptions.actions')}</span>,
      cell: (row) => (
        <div style={{ minWidth: '100px' }}>
          <UncontrolledDropdown>
            <DropdownToggle tag="button" className="btn btn-soft-secondary btn-sm">
              <i className="ri-more-fill align-middle"></i>
            </DropdownToggle>
            <DropdownMenu>
              <DropdownItem onClick={() => {
                setSelectedSubscription(row);
                setModal(true);
              }}>
                <i className="ri-pencil-fill me-2"></i>{t('subscriptions.edit')}
              </DropdownItem>
              <DropdownItem onClick={() => { 
                setSelectedSubscription(row);
                setDeleteModalVisible(true);
              }}>
                <i className="ri-delete-bin-fill me-2"></i>{t('subscriptions.delete')}
              </DropdownItem>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      ),
      width: '120px',
      minWidth: '120px', // Add minWidth to prevent collapsing
      ignoreRowClick: true,
      allowOverflow: true,
      button: true
    },
  
  ];

  return (
   
    <Container fluid style={{ marginTop: "80px" }}>
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
                    <h4 className="fw-semibold mb-2">{t('subscriptions.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('subscriptions.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <i className="ri-bookmark-line me-1"></i> {t('subscriptions.stats.totalPlans')}: {subscriptions.length || 0}
                      </Badge>
                      <Badge color="warning" pill className="fs-12 py-2 px-3">
                        <i className="ri-global-line me-1"></i> {t('subscriptions.stats.languages')}: {new Set(subscriptions.map(s => s.language || 'en')).size || 1}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={() => setModal(true)}
                      title={t('subscriptions.addSubscription')}
                    >
                      <i className="ri-add-line align-bottom me-1"></i> {t('subscriptions.addSubscription')}
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
            <CardHeader>
              <h4 className="card-title mb-0">{t('subscriptions.title')}</h4>
              {error && <div className="text-danger mt-2">{error}</div>}
            </CardHeader>

            <CardBody>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : (
                <>
                  <Button
                    color="primary"
                    onClick={() => setModal(true)}
                    className="mb-3"
                    style={{ float: 'right', marginLeft: '10px' }}
                  >
                    {t('subscriptions.addSubscription')}
                  </Button>

                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <input
                      type="text"
                      placeholder={t('subscriptions.searchPlaceholder')}
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="form-control"
                      style={{ maxWidth: "300px" }}
                    />
                    
                    <div className="text-muted small">
                      {subscriptions.length} subscription(s) found
                    </div>
                  </div>

                  <div className="table-responsive">
                    <DataTable
                      columns={columns}
                      data={filteredData}
                      pagination
                      paginationPerPage={5}
                      paginationRowsPerPageOptions={[5, 10, 20]}
                      highlightOnHover
                      responsive={false} // Disable default responsive behavior
                      striped
                      dense
                      noDataComponent={<div className="py-4">{t('subscriptions.noSubscriptionsFound')}</div>}
                      customStyles={{
                        cells: {
                          style: {
                            paddingTop: '8px',
                            paddingBottom: '8px',
                            overflow: 'visible' // Ensure dropdown isn't clipped
                          }
                        },
                        table: {
                          style: {
                            minWidth: '100%' // Ensure table takes full width
                          }
                        }
                      }}
                      fixedHeader
                      fixedHeaderScrollHeight="400px"
                    />
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <SubscriptionModal
        isOpen={modal}
        toggle={() => {
          setModal(!modal);
          if (!modal) setSelectedSubscription(null);
        }}
        subscription={selectedSubscription}
        onSave={loadSubscriptions}
      />

      <DeleteModal
        show={deleteModalVisible}
        onCloseClick={() => setDeleteModalVisible(false)}
        onDeleteClick={handleDelete}
      />
    </Container>
  );
};

export default SubscriptionList;