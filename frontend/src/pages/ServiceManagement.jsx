import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ServiceManagement.css';

const API = axios.create({
  baseURL: 'https://dharma-motors-backend.onrender.com/api'
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_min: '',
    price_max: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await API.get('/services');
      setServices(res.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingService) {
        await API.put(`/services/${editingService.id}`, formData);
        alert('✅ Service updated successfully!');
      } else {
        await API.post('/services', formData);
        alert('✅ Service created successfully!');
      }
      setFormData({ name: '', description: '', price_min: '', price_max: '' });
      setShowForm(false);
      setEditingService(null);
      fetchServices();
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Failed to save service'));
    }
    setLoading(false);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price_min: service.price_min,
      price_max: service.price_max
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await API.delete(`/services/${id}`);
      alert('✅ Service deleted successfully!');
      fetchServices();
    } catch (error) {
      alert('❌ Failed to delete service');
    }
  };

  return (
    <div className="service-management">
      <div className="service-header">
        <h2>💰 Service Catalog</h2>
        <button className="add-btn" onClick={() => {
          setEditingService(null);
          setFormData({ name: '', description: '', price_min: '', price_max: '' });
          setShowForm(!showForm);
        }}>
          {showForm ? '✕ Close' : '+ Add Service'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="service-form">
          <div className="form-grid">
            <input
              type="text"
              placeholder="Service Name *"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
            <input
              type="number"
              placeholder="Min Price (₹) *"
              value={formData.price_min}
              onChange={(e) => setFormData({...formData, price_min: e.target.value})}
              required
            />
            <input
              type="number"
              placeholder="Max Price (₹) *"
              value={formData.price_max}
              onChange={(e) => setFormData({...formData, price_max: e.target.value})}
              required
            />
          </div>
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
          />
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Saving...' : (editingService ? 'Update Service' : 'Add Service')}
          </button>
        </form>
      )}

      <div className="service-grid">
        {services.length === 0 ? (
          <p className="empty-state">No services added yet. Add your first service!</p>
        ) : (
          services.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-card-header">
                <div className="service-actions">
                  <button className="edit-btn" onClick={() => handleEdit(service)}>✏️</button>
                  <button className="delete-btn" onClick={() => handleDelete(service.id)}>🗑️</button>
                </div>
              </div>
              <h3>{service.name}</h3>
              <p className="service-desc">{service.description || 'No description'}</p>
              <div className="service-price">
                <span>₹{service.price_min.toLocaleString()}</span>
                <span> - </span>
                <span>₹{service.price_max.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ServiceManagement;