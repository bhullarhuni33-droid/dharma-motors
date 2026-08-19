import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Reminders.css';

const API = axios.create({
  baseURL: '/api'
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function Reminders({ user, onBack, onBookService }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/reminders/customer/${user.id}`);
      setReminders(res.data.reminders || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
    setLoading(false);
  };

  const getLevelIcon = (level) => {
    switch(level) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      case 'welcome': return '🟢';
      default: return '📌';
    }
  };

  const getLevelClass = (level) => {
    switch(level) {
      case 'critical': return 'level-critical';
      case 'warning': return 'level-warning';
      case 'info': return 'level-info';
      case 'welcome': return 'level-welcome';
      default: return 'level-info';
    }
  };

  if (loading) {
    return <div className="loading">Loading reminders...</div>;
  }

  return (
    <div className="reminders-page">
      <div className="reminders-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>🔔 Service Reminders</h2>
      </div>

      {reminders.length === 0 ? (
        <div className="empty-state">
          <p>🎉 No service reminders!</p>
          <p className="empty-sub">Your vehicles are up to date.</p>
        </div>
      ) : (
        <>
          <div className="reminders-stats">
            <div className="reminder-stat critical">
              <span>🔴</span>
              <div>
                <p>Overdue</p>
                <strong>{reminders.filter(r => r.level === 'critical').length}</strong>
              </div>
            </div>
            <div className="reminder-stat warning">
              <span>🟡</span>
              <div>
                <p>Due Soon</p>
                <strong>{reminders.filter(r => r.level === 'warning').length}</strong>
              </div>
            </div>
            <div className="reminder-stat info">
              <span>🔵</span>
              <div>
                <p>Upcoming</p>
                <strong>{reminders.filter(r => r.level === 'info').length}</strong>
              </div>
            </div>
          </div>

          <div className="reminders-list">
            {reminders.map((reminder, index) => (
              <div key={index} className={`reminder-card ${getLevelClass(reminder.level)}`}>
                <div className="reminder-icon">{getLevelIcon(reminder.level)}</div>
                <div className="reminder-content">
                  <h4>{reminder.model}</h4>
                  <p>{reminder.message}</p>
                  <div className="reminder-meta">
                    <span>🚗 {reminder.registration}</span>
                    {reminder.days_since_last_service !== 'No service history' && (
                      <span>📅 {reminder.days_since_last_service} days ago</span>
                    )}
                  </div>
                  <button 
                    className="book-btn"
                    onClick={() => onBookService(reminder.vehicle_id)}
                  >
                    📅 Book Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Reminders;