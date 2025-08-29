import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, message } from 'antd';

const ScheduledInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form] = Form.useForm();

  const frequencyOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'biannually', label: 'Biannually' },
    { value: 'annually', label: 'Annually' },
  ];

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/scheduled-invoices');
      setInvoices(response.data);
    } catch (error) {
      message.error('Failed to fetch scheduled invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    form.setFieldsValue({
      name: invoice.name,
      frequency: invoice.frequency,
      // Set other fields as needed
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/scheduled-invoices/${id}`);
      message.success('Scheduled invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      message.error('Failed to delete scheduled invoice');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await axios.patch(`/api/scheduled-invoices/${id}/toggle-active`);
      message.success(`Scheduled invoice ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchInvoices();
    } catch (error) {
      message.error('Failed to toggle scheduled invoice status');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingInvoice) {
        await axios.put(`/api/scheduled-invoices/${editingInvoice._id}`, values);
        message.success('Scheduled invoice updated successfully');
      } else {
        await axios.post('/api/scheduled-invoices', values);
        message.success('Scheduled invoice created successfully');
      }
      
      setIsModalVisible(false);
      fetchInvoices();
    } catch (error) {
      message.error('Error saving scheduled invoice');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (text) => text.charAt(0).toUpperCase() + text.slice(1),
    },
    {
      title: 'Next Run',
      dataIndex: 'nextRun',
      key: 'nextRun',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'status',
      render: (active) => (
        <span style={{ color: active ? 'green' : 'red' }}>
          {active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button onClick={() => handleEdit(record)}>Edit</Button>
          <Button 
            onClick={() => toggleActive(record._id, record.active)}
            type={record.active ? 'default' : 'primary'}
          >
            {record.active ? 'Stop' : 'Start'}
          </Button>
          <Button danger onClick={() => handleDelete(record._id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={() => {
            setEditingInvoice(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Create New Scheduled Invoice
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={invoices} 
        loading={loading} 
        rowKey="_id" 
      />
      
      <Modal
        title={editingInvoice ? 'Edit Scheduled Invoice' : 'Create Scheduled Invoice'}
        visible={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Invoice Name"
            rules={[{ required: true, message: 'Please input the invoice name!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="frequency"
            label="Frequency"
            rules={[{ required: true, message: 'Please select a frequency!' }]}
          >
            <Select options={frequencyOptions} />
          </Form.Item>
          
          {/* Add more form fields as needed */}
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduledInvoices;