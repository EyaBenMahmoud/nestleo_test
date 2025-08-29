import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, Form, Button, Input, FormFeedback, Alert } from 'reactstrap';
import { createAdmin, updateAdmin } from '../../services/userService';
import { withTranslation } from 'react-i18next';

const AdminModal = ({ isOpen, toggle, admin, onSave, onClose, t }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: "Admin",
        SubRole: '',
        status: 'Active',
    });

    const [errors, setErrors] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        SubRole: '',
    });

    const [successModal, setSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Added');

    useEffect(() => {
        if (admin) {
            setFormData({
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: admin.role || "Admin",
                SubRole: admin.SubRole,
                status: admin.status,
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                role: "Admin",
                SubRole: '',
                status: 'Active',
            });
        }
        setErrors({});
    }, [admin, isOpen]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = t('adminModal.errors.firstNameRequired');
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = t('adminModal.errors.lastNameRequired');
        }

        if (!formData.email.trim()) {
            newErrors.email = t('adminModal.errors.emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t('adminModal.errors.emailInvalid');
        }

        if (!formData.SubRole) {
            newErrors.SubRole = t('adminModal.errors.subRoleRequired');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const submissionData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: formData.role,
                SubRole: formData.SubRole,
                status: formData.status,
            };

            if (admin) {
                await updateAdmin(admin._id, submissionData);
                setSuccessModal(true);
                setSuccessMessage('Updated');
            } else {
                await createAdmin(submissionData);
                setSuccessModal(true);
                setSuccessMessage('Added');
            }
            onSave();
            toggle();
        } catch (error) {
            console.error('Error saving admin:', error);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} toggle={toggle} onClosed={onClose}>
                <ModalHeader toggle={toggle}>
                    {admin ? t('adminModal.editAdmin') : t('adminModal.addAdmin')}
                </ModalHeader>
                <ModalBody>
                    <Form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label>{t('adminModal.form.firstName')}</label>
                            <Input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                invalid={!!errors.firstName}
                            />
                            <FormFeedback>{errors.firstName}</FormFeedback>
                        </div>

                        <div className="mb-3">
                            <label>{t('adminModal.form.lastName')}</label>
                            <Input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                invalid={!!errors.lastName}
                            />
                            <FormFeedback>{errors.lastName}</FormFeedback>
                        </div>

                        <div className="mb-3">
                            <label>{t('adminModal.form.email')}</label>
                            <Input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                invalid={!!errors.email}
                            />
                            <FormFeedback>{errors.email}</FormFeedback>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-bold">{t('adminModal.form.role')}</label>
                            <div className="p-2 border rounded bg-light">
                                <strong className="text-primary">{t(`adminModal.roles.${formData.role.toLowerCase()}`, { defaultValue: formData.role })}</strong>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label>{t('adminModal.form.subRole')}</label>
                            <Input
                                type="select"
                                name="SubRole"
                                value={formData.SubRole}
                                onChange={handleChange}
                                invalid={!!errors.SubRole}
                            >
                                <option value="">{t('adminModal.form.selectSubRole')}</option>
                                <option value="It_support">{t('adminModal.subRoles.it_support')}</option>
                                <option value="Technical_Support">{t('adminModal.subRoles.technical_support')}</option>
                            </Input>
                            <FormFeedback>{errors.SubRole}</FormFeedback>
                        </div>

                        <div className="d-flex justify-content-end gap-2">
                            <Button color="secondary" onClick={toggle}>{t('adminModal.form.cancel')}</Button>
                            <Button color="primary" type="submit">
                                {admin ? t('adminModal.form.update') : t('adminModal.form.save')}
                            </Button>
                        </div>
                    </Form>
                </ModalBody>
            </Modal>

            <Modal isOpen={successModal} toggle={() => setSuccessModal(false)} centered>
                <ModalBody className='text-center p-5'>
                    <div className="text-end">
                        <button type="button" onClick={() => setSuccessModal(false)} className="btn-close text-end" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="mt-2">
                        <lord-icon src="https://cdn.lordicon.com/tqywkdcz.json" trigger="hover" style={{ width: "150px", height: "150px" }}></lord-icon>
                        <h4 className="mb-3 mt-4">{t('adminModal.success.title', { action: t(`adminModal.success.actions.${successMessage.toLowerCase()}`) })}</h4>
                        <p className="text-muted fs-15 mb-4">{t('adminModal.success.message', { action: t(`adminModal.success.actions.${successMessage.toLowerCase()}`) })}</p>
                        <div className="hstack gap-2 justify-content-center">
                            <button className="btn btn-primary" onClick={() => setSuccessModal(false)}>{t('adminModal.success.close')}</button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
};

export default withTranslation()(AdminModal);