import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VehicleHealthPassport.css';

const API = axios.create({
  baseURL: 'https://dharma-motors-backend.onrender.com/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function VehicleHealthPassport({ vehicleId, onBack }) {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPassport();
  }, [vehicleId]);

  const fetchPassport = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/passport/${vehicleId}`);
      setPassport(res.data.health_passport);
    } catch (error) {
      console.error('Error fetching passport:', error);
      alert('Failed to load vehicle health data');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading">Loading your vehicle health...</div>;
  }

  if (!passport) {
    return <div className="empty-state">No vehicle data available</div>;
  }

  const { vehicle, summary, maintenance, service_history } = passport;

  // Calculate days since last service
  const getDaysSince = (date) => {
    if (!date) return null;
    const diff = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysSince = getDaysSince(summary.last_service?.date);

  return (
    <div className="health-passport">
      {/* Header */}
      <div className="passport-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>🪪 Vehicle Health</h2>
      </div>

      {/* Vehicle Info */}
      <div className="vehicle-card">
        <div className="vehicle-icon">🚗</div>
        <div className="vehicle-info">
          <h3>{vehicle.model}</h3>
          <p>{vehicle.registration}</p>
          <p className="vehicle-meta">{vehicle.type || 'Car'} • {vehicle.fuel || 'Petrol'}</p>
          <p className="vehicle-km">📍 {vehicle.current_km.toLocaleString()} km</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-num">{summary.total_visits}</span>
          <span className="stat-label">Total Visits</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{summary.completed_services}</span>
          <span className="stat-label">Services Done</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">₹{summary.total_spent?.toLocaleString() || 0}</span>
          <span className="stat-label">Total Spent</span>
        </div>
      </div>

      {/* Last Service */}
      <div className="section-card">
        <h4>📅 Last Service</h4>
        {summary.last_service ? (
          <div className="service-item">
            <div className="service-date">{new Date(summary.last_service.date).toLocaleDateString()}</div>
            <div className="service-name">{summary.last_service.problem || 'Service'}</div>
            <div className="service-status completed">✅ Completed</div>
            {daysSince !== null && (
              <div className="service-days">{daysSince} days ago</div>
            )}
          </div>
        ) : (
          <p className="empty-text">No service history yet</p>
        )}
      </div>

      {/* Next Service */}
      <div className="section-card warning">
        <h4>⚠️ Next Service Due</h4>
        <div className="next-service-grid">
          <div>
            <span className="label">KM</span>
            <span className="value">{maintenance.next_service_km.toLocaleString()} km</span>
          </div>
          <div>
            <span className="label">KM Until</span>
            <span className="value">{maintenance.km_until_service.toLocaleString()} km</span>
          </div>
          <div>
            <span className="label">Date</span>
            <span className="value">{maintenance.next_service_date}</span>
          </div>
        </div>
        <button className="book-btn" onClick={() => {
          onBack();
          // Navigate to booking
        }}>
          📅 Book Service Now
        </button>
      </div>

      {/* Service History */}
      <div className="section-card">
        <h4>📋 Service History</h4>
        {service_history.length === 0 ? (
          <p className="empty-text">No service history available</p>
        ) : (
          service_history.slice(0, 5).map((service, index) => (
            <div key={service.id || index} className="history-item">
              <div className="history-left">
                <span className="history-date">{new Date(service.date).toLocaleDateString()}</span>
                <span className="history-name">{service.problem || 'Service'}</span>
              </div>
              <div className="history-right">
                {service.invoice && (
                  <span className="history-amount">₹{service.invoice.total?.toLocaleString() || 0}</span>
                )}
                <span className={`history-status ${service.status}`}>
                  {service.status === 'completed' ? '✅' : service.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Book Again Button */}
      <button className="book-again-btn" onClick={() => {
        onBack();
      }}>
        📅 Book Service
      </button>
    </div>
  );
}

export default VehicleHealthPassport;