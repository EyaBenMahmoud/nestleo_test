import React from 'react';
import { 
  Modal, ModalHeader, ModalBody, ModalFooter, 
  Form, FormGroup, Label, Input, Button, Alert, Spinner
} from 'reactstrap';
import { FaStar, FaEdit } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import StarRating from './StarRating';

const ReviewModal = ({
  isOpen,
  toggle,
  editingReview,
  currentBuilding,
  workersLoading,
  workers,
  newReview,
  setNewReview,
  validationErrors,
  handleSubmitReview,
  loading
}) => {
  const { t } = useTranslation();
  
  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle} tag="div">
        <div className="d-flex align-items-center">
          {editingReview ? (
            <>
              <FaEdit className="mr-2" /> {t('reviewModal.editReview')}
            </>
          ) : (
            <>
              <FaStar className="mr-2" /> {t('reviewModal.createNewReview')}
            </>
          )}
        </div>
        <div className="text-muted small mt-1">
          {currentBuilding?.name || t('reviewModal.selectedBuilding')}
        </div>  
      </ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label for="workerSelect" className="font-weight-bold">
              {t('reviewModal.selectWorker')} <span className="text-danger">*</span>
            </Label>
            {workersLoading ? (
              <div className="text-center p-3">
                <Spinner size="sm" color="primary" />
                <p className="mb-0 mt-2">{t('reviewModal.loadingWorkers')}</p>
              </div>
            ) : workers.length === 0 ? (
              <Alert color="warning">
                {t('reviewModal.noWorkersFound')}
              </Alert>
            ) : (
              <>
                <Input
                  type="select"
                  id="workerSelect"
                  value={newReview.workerId}
                  onChange={(e) => setNewReview({...newReview, workerId: e.target.value})}
                  invalid={!!validationErrors.workerId}
                  disabled={!!editingReview}
                >
                  <option value="">{t('reviewModal.selectWorkerPlaceholder')}</option>
                  {workers.map((worker) => (
                    <option key={worker._id} value={worker._id}>
                      {worker.firstName} {worker.lastName} ({worker.email})
                    </option>
                  ))}
                </Input>
                {validationErrors.workerId && (
                  <div className="text-danger small mt-1">{validationErrors.workerId}</div>
                )}
              </>
            )}
          </FormGroup>

          <FormGroup>
            <Label className="font-weight-bold">
              {t('reviewModal.rating')} <span className="text-danger">*</span>
            </Label>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center">
                <StarRating 
                  rating={newReview.rating}
                  onRatingChange={(rating) => setNewReview({...newReview, rating})}
                  editable={true}
                  size="1.5rem"
                />
                <span className="font-weight-bold ml-3" style={{ color: 
                  newReview.rating === 5 ? '#10b981' : 
                  newReview.rating === 4 ? '#3b82f6' : 
                  newReview.rating === 3 ? '#f59e0b' : 
                  newReview.rating === 2 ? '#f59f00' : 
                  newReview.rating === 1 ? '#ef4444' : '#64748b' 
                }}>
                  {newReview.rating === 5 ? t('reviewModal.excellent') : 
                   newReview.rating === 4 ? t('reviewModal.veryGood') : 
                   newReview.rating === 3 ? t('reviewModal.good') : 
                   newReview.rating === 2 ? t('reviewModal.fair') : 
                   newReview.rating === 1 ? t('reviewModal.poor') : 
                   t('reviewModal.selectRating')}
                </span>
              </div>
              {validationErrors.rating && (
                <div className="text-danger small mt-1">{validationErrors.rating}</div>
              )}
            </div>
          </FormGroup>

          <FormGroup>
            <Label for="content" className="font-weight-bold">
              {t('reviewModal.reviewContent')} <span className="text-danger">*</span>
            </Label>
            <Input
              type="textarea"
              id="content"
              value={newReview.content}
              onChange={(e) => setNewReview({...newReview, content: e.target.value})}
              rows={5}
              invalid={!!validationErrors.content}
              placeholder={t('reviewModal.reviewContentPlaceholder')}
              className="comment-input"
            />
            {validationErrors.content && (
              <div className="text-danger small mt-1">{validationErrors.content}</div>
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button 
          color="danger" 
          onClick={toggle}
        >
          {t('reviewModal.cancel')}
        </Button>
        <Button 
          color="primary" 
          onClick={handleSubmitReview} 
          disabled={loading || workers.length === 0}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" /> {t('reviewModal.saving')}
            </>
          ) : editingReview ? (
            t('reviewModal.updateReview')
          ) : (
            t('reviewModal.submitReview')
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ReviewModal;