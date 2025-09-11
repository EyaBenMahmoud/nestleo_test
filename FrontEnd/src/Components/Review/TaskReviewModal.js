import React from 'react';
import { 
  Modal, ModalHeader, ModalBody, ModalFooter, 
  Form, FormGroup, Label, Input, Button, Spinner
} from 'reactstrap';
import StarRating from './StarRating';
import { withTranslation } from 'react-i18next';

const TaskReviewModal = ({
  isOpen,
  toggle,
  taskReviewData,
  setTaskReviewData,
  handleTaskReviewSubmit,
  currentTaskReview,
  loading,
  t
}) => {
  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <div>
          {taskReviewData.reviewId ? t('reviews.task.editTitle') : t('reviews.task.createTitle')}
          {currentTaskReview?.task?.title && (
            <div className="small text-muted mt-1">
              {t('reviews.task.task')}: {currentTaskReview.task.title}
            </div>
          )}
        </div>
      </ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label className="font-weight-bold">
              {t('reviews.task.rating')} <span className="text-danger">*</span>
            </Label>
            <div className="p-4 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center">
                <StarRating 
                  rating={taskReviewData.rating}
                  onRatingChange={(rating) => setTaskReviewData({...taskReviewData, rating})}
                  editable={true}
                  size="1.5rem"
                />
                <span className="font-weight-bold ml-3" style={{ color: 
                  taskReviewData.rating === 5 ? '#10b981' : 
                  taskReviewData.rating === 4 ? '#3b82f6' : 
                  taskReviewData.rating === 3 ? '#f59e0b' : 
                  taskReviewData.rating === 2 ? '#f59f00' : 
                  taskReviewData.rating === 1 ? '#ef4444' : '#64748b' 
                }}>
                  {taskReviewData.rating === 5 ? t('reviews.task.excellent') : 
                   taskReviewData.rating === 4 ? t('reviews.task.veryGood') : 
                   taskReviewData.rating === 3 ? t('reviews.task.good') : 
                   taskReviewData.rating === 2 ? t('reviews.task.fair') : 
                   taskReviewData.rating === 1 ? t('reviews.task.poor') : 
                   t('reviews.task.selectRating')}
                </span>
              </div>
            </div>
          </FormGroup>
          
          <FormGroup>
            <Label className="font-weight-bold">
              {t('reviews.task.content')} <span className="text-danger">*</span>
            </Label>
            <Input
              type="textarea"
              value={taskReviewData.content}
              onChange={(e) => setTaskReviewData({...taskReviewData, content: e.target.value})}
              rows={5}
              placeholder={t('reviews.task.contentPlaceholder')}
              className="comment-input"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="danger" onClick={toggle}>
          {t('reviews.task.cancel')}
        </Button>
        <Button 
          color="primary"
          onClick={handleTaskReviewSubmit}
          disabled={!taskReviewData.content || taskReviewData.rating < 1 || loading}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {t('reviews.task.submitting')}
            </>
          ) : taskReviewData.reviewId ? (
            t('reviews.task.updateReview')
          ) : (
            t('reviews.task.submitReview')
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default withTranslation()(TaskReviewModal);