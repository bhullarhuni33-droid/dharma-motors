import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './CustomerApp.css'
import VehicleHealthPassport from './VehicleHealthPassport'
import Rewards from './Rewards'
import Reminders from './Reminders'

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function CustomerApp({ user, onLogout }) {
  const [vehicles, setVehicles] = useState([])
  const [appointments, setAppointments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [services, setServices] = useState([])
  const [view, setView] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [showPassport, setShowPassport] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)
  const [showRewards, setShowRewards] = useState(false)
  const [showReminders, setShowReminders] = useState(false)

  const [vehicleForm, setVehicleForm] = useState({
    registration: '',
    model: '',
    type: '',
    fuel: '',
    current_km: ''
  })

  const [appointmentForm, setAppointmentForm] = useState({
    vehicle_id: '',
    service_type: '',
    date: '',
    notes: ''
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    await Promise.all([
      fetchVehicles(),
      fetchAppointments(),
      fetchInvoices(),
      fetchServices()
    ])
  }

  const fetchVehicles = async () => {
    try {
      const res = await API.get(`/vehicles/customer/${user.id}`)
      setVehicles(res.data.vehicles || [])
      if (res.data.vehicles && res.data.vehicles.length > 0) {
        setAppointmentForm(prev => ({
          ...prev,
          vehicle_id: res.data.vehicles[0].id
        }))
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    }
  }

  const fetchAppointments = async () => {
    try {
      const res = await API.get(`/appointments/customer/${user.id}`)
      setAppointments(res.data.appointments || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const res = await API.get(`/invoices/customer/${user.id}`)
      setInvoices(res.data.invoices || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const fetchServices = async () => {
    try {
      const res = await API.get('/services')
      setServices(res.data.services || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const openHealthPassport = (vehicleId) => {
    setSelectedVehicleId(vehicleId)
    setShowPassport(true)
  }

  const openRewards = () => setShowRewards(true)
  const openReminders = () => setShowReminders(true)

  const handleBookFromReminder = (vehicleId) => {
    setShowReminders(false)
    setAppointmentForm(prev => ({ ...prev, vehicle_id: vehicleId }))
    setView('book')
  }

  const downloadInvoice = async (invoiceId) => {
    try {
      const url = `http://localhost:5000/api/invoices/${invoiceId}/download`
      window.open(url, '_blank')
    } catch (error) {
      alert('Failed to download invoice')
    }
  }

  const addVehicle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        ...vehicleForm,
        customer_id: user.id,
        current_km: parseInt(vehicleForm.current_km) || 0
      }
      await API.post('/vehicles/add', data)
      alert('✅ Vehicle added successfully!')
      setVehicleForm({ registration: '', model: '', type: '', fuel: '', current_km: '' })
      fetchVehicles()
      setView('dashboard')
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Failed to add vehicle'))
    }
    setLoading(false)
  }

  const bookAppointment = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!appointmentForm.vehicle_id) {
        alert('Please select a vehicle')
        setLoading(false)
        return
      }
      if (!appointmentForm.service_type) {
        alert('Please select a service')
        setLoading(false)
        return
      }
      if (!appointmentForm.date) {
        alert('Please select a date')
        setLoading(false)
        return
      }

      const data = {
        ...appointmentForm,
        customer_id: user.id,
        time: '10:00:00'
      }
      await API.post('/appointments/book', data)
      alert('✅ Appointment booked successfully!')
      setAppointmentForm({ 
        vehicle_id: vehicles[0]?.id || '', 
        service_type: '', 
        date: '', 
        notes: '' 
      })
      fetchAppointments()
      setView('dashboard')
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Failed to book appointment'))
    }
    setLoading(false)
  }

  // RENDER DASHBOARD
  const renderDashboard = () => {
    const activeAppointments = appointments.filter(a => 
      ['pending', 'confirmed', 'check-in', 'diagnosis', 'repair', 'qc', 'ready'].includes(a.status)
    )
    const hasActiveService = activeAppointments.length > 0

    return (
      <>
        {/* HEADER - DHARMA MOTORS WITH BLUE */}
<div className="dashboard-header">
 <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
  <img 
    src="/logo.png" 
    alt="Dharma Motors"
    style={{ 
      width: '40px',
      height: 'auto'
    }}
  />
  <div>
    <h1 style={{ 
      fontSize: '20px', 
      color: '#1A1A2E',
      margin: 0
    }}>
      DHARMA MOTORS
    </h1>
    <p style={{ 
      fontSize: '14px', 
      color: '#666',
      margin: '2px 0 0 0'
    }}>
      Welcome back, {user?.full_name}
    </p>
  </div>
</div>
  <button onClick={onLogout} className="logout-btn" style={{
    background: 'transparent',
    border: '2px solid #1A56DB',
    color: '#1A56DB',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  }}>
    Logout
  </button>
</div>

        {/* STATS */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🚗</span>
            <div>
              <p className="stat-label">Vehicles</p>
              <p className="stat-number">{vehicles.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div>
              <p className="stat-label">Services</p>
              <p className="stat-number">{appointments.length}</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2A2A4E 100%)', color: 'white' }}>
            <span className="stat-icon">🎁</span>
            <div>
              <p className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Points</p>
              <p className="stat-number" style={{ color: '#C9A84C' }}>1,250</p>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="quick-actions">
          <button className="action-btn primary" onClick={() => setView('book')}>
            📅 Book Service
          </button>
          <button className="action-btn secondary" onClick={() => setView('addVehicle')}>
            🚗 Add Vehicle
          </button>
          <button className="action-btn secondary" onClick={openRewards}>
            🎁 Rewards
          </button>
          <button className="action-btn secondary" onClick={openReminders}>
            🔔 Reminders
          </button>
        </div>

        {/* ACTIVE SERVICES */}
        {hasActiveService && (
          <div className="card" style={{ borderLeft: '4px solid #C9A84C' }}>
            <h3>🔧 Active Services</h3>
            {activeAppointments.slice(0, 3).map(a => (
              <div key={a.id} className="appointment-item">
                <div>
                  <strong>{a.service_type}</strong>
                  <p>{a.date}</p>
                </div>
                <span className={`status-badge ${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* MY GARAGE */}
        <div className="card">
          <h3>🚗 My Garage</h3>
          {vehicles.length === 0 ? (
            <p className="empty-state">No vehicles added yet</p>
          ) : (
            vehicles.map(v => (
              <div key={v.id} className="vehicle-item">
                <div>
                  <strong>{v.model}</strong>
                  <p>{v.registration}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="vehicle-type">{v.type || 'Car'}</span>
                  <button 
                    className="passport-btn"
                    onClick={() => openHealthPassport(v.id)}
                  >
                    📋 Health
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RECENT APPOINTMENTS */}
        <div className="card">
          <h3>📅 Recent Appointments</h3>
          {appointments.length === 0 ? (
            <p className="empty-state">No appointments yet</p>
          ) : (
            appointments.slice(0, 3).map(a => (
              <div key={a.id} className="appointment-item">
                <div>
                  <strong>{a.service_type}</strong>
                  <p>{a.date}</p>
                </div>
                <span className={`status-badge ${a.status}`}>{a.status}</span>
              </div>
            ))
          )}
        </div>

        {/* RECENT INVOICES */}
        <div className="card">
          <h3>🧾 Recent Invoices</h3>
          {invoices.length === 0 ? (
            <p className="empty-state">No invoices yet</p>
          ) : (
            invoices.slice(0, 2).map(inv => (
              <div key={inv.id} className="invoice-item">
                <div>
                  <strong>{inv.service_name || 'Service'}</strong>
                  <p>{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="invoice-actions">
                  <span className="invoice-amount">₹{inv.total_cost?.toLocaleString() || '0'}</span>
                  <button 
                    className="download-btn"
                    onClick={() => downloadInvoice(inv.id)}
                  >
                    📄 PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    )
  }

  // RENDER BOOK APPOINTMENT
  const renderBookAppointment = () => {
    const activeServices = services.filter(s => s.is_active !== false)

    return (
      <>
        <div className="page-header">
          <button onClick={() => setView('dashboard')} className="back-btn">← Back</button>
          <h2>📅 Book Service</h2>
        </div>

        <form onSubmit={bookAppointment} className="form-card">
          <div className="form-group">
            <label>Select Vehicle</label>
            <select
              value={appointmentForm.vehicle_id}
              onChange={(e) => setAppointmentForm({...appointmentForm, vehicle_id: e.target.value})}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.model} - {v.registration}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Select Service</label>
            <select
              value={appointmentForm.service_type}
              onChange={(e) => setAppointmentForm({...appointmentForm, service_type: e.target.value})}
              required
            >
              <option value="">Select a service</option>
              {activeServices.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} (₹{s.price_min} - ₹{s.price_max})
                </option>
              ))}
            </select>
          </div>

          {appointmentForm.service_type && (
            <div className="service-info">
              {services.find(s => s.name === appointmentForm.service_type)?.description}
            </div>
          )}

          <div className="form-group">
            <label>Preferred Date</label>
            <input
              type="date"
              value={appointmentForm.date}
              onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <input
              type="text"
              placeholder="Any special requests?"
              value={appointmentForm.notes}
              onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})}
            />
          </div>

          <button type="submit" className="submit-btn btn-gold" disabled={loading}>
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        </form>
      </>
    )
  }

  // RENDER ADD VEHICLE
  const renderAddVehicle = () => (
    <>
      <div className="page-header">
        <button onClick={() => setView('dashboard')} className="back-btn">← Back</button>
        <h2>🚗 Add Vehicle</h2>
      </div>

      <form onSubmit={addVehicle} className="form-card">
        <input
          type="text"
          placeholder="Registration Number *"
          value={vehicleForm.registration}
          onChange={(e) => setVehicleForm({...vehicleForm, registration: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Model *"
          value={vehicleForm.model}
          onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Type (Car, Truck, SUV)"
          value={vehicleForm.type}
          onChange={(e) => setVehicleForm({...vehicleForm, type: e.target.value})}
        />
        <input
          type="text"
          placeholder="Fuel (Petrol/Diesel/Electric)"
          value={vehicleForm.fuel}
          onChange={(e) => setVehicleForm({...vehicleForm, fuel: e.target.value})}
        />
        <input
          type="number"
          placeholder="Current KM"
          value={vehicleForm.current_km}
          onChange={(e) => setVehicleForm({...vehicleForm, current_km: e.target.value})}
        />
        <button type="submit" className="submit-btn btn-gold" disabled={loading}>
          {loading ? 'Adding...' : 'Add Vehicle'}
        </button>
      </form>
    </>
  )

  // RENDER CHECKS
  if (showPassport && selectedVehicleId) {
    return <VehicleHealthPassport vehicleId={selectedVehicleId} onBack={() => setShowPassport(false)} />
  }
  if (showRewards) {
    return <Rewards user={user} onBack={() => setShowRewards(false)} />
  }
  if (showReminders) {
    return <Reminders user={user} onBack={() => setShowReminders(false)} onBookService={handleBookFromReminder} />
  }

  return (
    <div className="customer-app">
      {view === 'dashboard' && renderDashboard()}
      {view === 'book' && renderBookAppointment()}
      {view === 'addVehicle' && renderAddVehicle()}
    </div>
  )
}

export default CustomerApp