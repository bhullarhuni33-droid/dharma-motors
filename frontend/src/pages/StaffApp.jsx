import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './StaffApp.css'
import ServiceManagement from './pages/ServiceManagement'

const API = axios.create({
  baseURL: 'https://dharma-motors-backend.onrender.com/api',
  headers: { 'Content-Type': 'application/json' }
})

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function StaffApp({ user, onLogout }) {
  const [view, setView] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [recentActivity, setRecentActivity] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [rewardsCatalog, setRewardsCatalog] = useState([])
  const [loading, setLoading] = useState(false)

  // Customer form for walk-in
  const [customerForm, setCustomerForm] = useState({
    full_name: '',
    mobile: '',
    email: '',
    password: 'password123'
  })

  // Vehicle form for walk-in
  const [vehicleForm, setVehicleForm] = useState({
    registration: '',
    model: '',
    type: '',
    fuel: '',
    current_km: ''
  })

  // Reward form
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    points_required: ''
  })

  // Invoice form state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceJob, setInvoiceJob] = useState(null)
  const [invoiceData, setInvoiceData] = useState({
    service_name: '',
    parts_cost: '',
    labour_cost: '',
    diagnostics_cost: ''
  })

  useEffect(() => {
    if (view === 'dashboard') {
      fetchDashboard()
      fetchRecentActivity()
    }
    if (view === 'appointments') fetchAppointments()
    if (view === 'jobs') fetchJobs()
    if (view === 'customers') fetchCustomers()
    if (view === 'invoices') fetchInvoices()
    if (view === 'rewards') fetchRewards()
  }, [view])

  const fetchDashboard = async () => {
    try {
      const res = await API.get('/staff/dashboard')
      setDashboard(res.data.dashboard)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const res = await API.get('/staff/recent-activity')
      setRecentActivity(res.data)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/appointments')
      setAppointments(res.data.appointments || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const res = await API.get('/jobs')
      setJobs(res.data.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await API.get('/customers')
      setCustomers(res.data.customers || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const res = await API.get('/invoices')
      setInvoices(res.data.invoices || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const fetchRewards = async () => {
    try {
      const res = await API.get('/rewards/catalog')
      setRewardsCatalog(res.data.rewards || [])
    } catch (error) {
      console.error('Error fetching rewards:', error)
    }
  }

  // ============================================
  // APPOINTMENT ACTIONS
  // ============================================
  const acceptAppointment = async (id, customerId, vehicleId, serviceType) => {
    try {
      await API.patch(`/appointments/${id}/status`, { status: 'confirmed' })
      
      const jobData = {
        customer_id: customerId,
        vehicle_id: vehicleId,
        problem: serviceType
      }
      await API.post('/jobs/create', jobData)
      
      alert('✅ Appointment accepted! Service job created.')
      fetchAppointments()
      fetchJobs()
      fetchDashboard()
      fetchRecentActivity()
    } catch (error) {
      alert('❌ Failed to accept appointment')
      console.error(error)
    }
  }

  const rejectAppointment = async (id) => {
    try {
      await API.patch(`/appointments/${id}/status`, { status: 'cancelled' })
      alert('❌ Appointment cancelled')
      fetchAppointments()
      fetchDashboard()
      fetchRecentActivity()
    } catch (error) {
      alert('Failed to reject appointment')
    }
  }

  // ============================================
  // JOB ACTIONS
  // ============================================
  const updateJobStatus = async (id, status) => {
    try {
      await API.patch(`/jobs/${id}/status`, { status })
      alert(`✅ Job status updated to: ${status}`)
      fetchJobs()
      fetchDashboard()
      fetchRecentActivity()
    } catch (error) {
      alert('Failed to update job status')
    }
  }

  // ============================================
  // INVOICE ACTIONS
  // ============================================
  const openInvoiceForm = (job) => {
    setInvoiceJob(job)
    setInvoiceData({
      service_name: job?.problem || 'Service',
      parts_cost: '',
      labour_cost: '',
      diagnostics_cost: ''
    })
    setShowInvoiceForm(true)
  }

  const closeInvoiceForm = () => {
    setShowInvoiceForm(false)
    setInvoiceJob(null)
    setInvoiceData({
      service_name: '',
      parts_cost: '',
      labour_cost: '',
      diagnostics_cost: ''
    })
  }

  const createInvoice = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const parts = parseFloat(invoiceData.parts_cost) || 0
    const labour = parseFloat(invoiceData.labour_cost) || 0
    const diagnostics = parseFloat(invoiceData.diagnostics_cost) || 0
    
    if (parts === 0 && labour === 0 && diagnostics === 0) {
      alert('Please enter at least one cost')
      setLoading(false)
      return
    }

    try {
      const payload = {
        service_job_id: invoiceJob?.id || 'manual-' + Date.now(),
        customer_id: invoiceJob?.customer_id,
        vehicle_id: invoiceJob?.vehicle_id,
        parts_cost: parts,
        labour_cost: labour,
        diagnostics_cost: diagnostics,
        service_name: invoiceData.service_name
      }

      await API.post('/invoices/create', payload)
      
      alert('✅ Invoice created successfully!')
      closeInvoiceForm()
      fetchInvoices()
      fetchJobs()
      fetchDashboard()
    } catch (error) {
      console.error('❌ Invoice error:', error)
      alert('❌ Failed to create invoice: ' + (error.response?.data?.error || error.message))
    }
    setLoading(false)
  }

  const markInvoicePaid = async (id) => {
    try {
      const mode = prompt('Payment Mode (cash/upi/card/bank/other):')
      if (!mode) return
      await API.patch(`/invoices/${id}/pay`, { payment_mode: mode })
      alert('✅ Invoice marked as paid! Customer got reward points!')
      fetchInvoices()
      fetchDashboard()
      fetchRecentActivity()
    } catch (error) {
      alert('Failed to mark invoice as paid')
    }
  }

  // ============================================
  // REWARD ACTIONS
  // ============================================
  const createReward = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await API.post('/rewards/catalog', {
        name: rewardForm.name,
        description: rewardForm.description,
        points_required: parseInt(rewardForm.points_required)
      })
      alert('✅ Reward created successfully!')
      setRewardForm({ name: '', description: '', points_required: '' })
      fetchRewards()
    } catch (error) {
      alert('❌ Failed to create reward')
      console.error(error)
    }
    setLoading(false)
  }

  // ============================================
  // WALK-IN CUSTOMER
  // ============================================
  const createWalkInCustomer = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const custRes = await API.post('/auth/register', customerForm)
      const customerId = custRes.data.user.id

      const vehicleRes = await API.post('/vehicles/add', {
        ...vehicleForm,
        customer_id: customerId,
        current_km: parseInt(vehicleForm.current_km) || 0
      })
      const vehicleId = vehicleRes.data.vehicle.id

      alert('✅ Customer and vehicle created successfully!')
      setCustomerForm({ full_name: '', mobile: '', email: '', password: 'password123' })
      setVehicleForm({ registration: '', model: '', type: '', fuel: '', current_km: '' })
      
      const problem = prompt('Enter the problem/issue with the vehicle:')
      if (problem) {
        await API.post('/jobs/create', {
          customer_id: customerId,
          vehicle_id: vehicleId,
          problem: problem
        })
        alert('✅ Service job created!')
      }
      
      fetchCustomers()
      fetchJobs()
      fetchDashboard()
      fetchRecentActivity()
      setView('dashboard')
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Failed to create customer'))
    }
    setLoading(false)
  }

  // ============================================
  // RENDER DASHBOARD
  // ============================================
  const renderDashboard = () => (
    <>
      {/* HEADER - DHARMA MOTORS WITH LOGO */}
      <div className="staff-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '2px solid #1A56DB',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Dharma Motors"
            style={{ 
              width: '36px',
              height: 'auto'
            }}
          />
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1E293B',
            margin: 0
          }}>
            DHARMA MOTORS
          </h1>
        </div>
        <div className="user-info" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#64748B'
        }}>
          <span style={{ fontWeight: '600', color: '#1E293B' }}>{user?.full_name}</span>
          <span style={{ color: '#94A3B8', fontSize: '11px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
          </span>
          <button onClick={onLogout} style={{
            background: 'transparent',
            border: '2px solid #1A56DB',
            color: '#1A56DB',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            Logout
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-info">
            <p className="stat-label">Today's Appointments</p>
            <p className="stat-number">{dashboard?.appointments_today || 0}</p>
            {dashboard?.pending_appointments > 0 && (
              <p className="stat-sub">⏳ {dashboard.pending_appointments} pending</p>
            )}
          </div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #1E4EB0 100%)', color: 'white' }}>
          <span className="stat-icon">🔧</span>
          <div className="stat-info">
            <p className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Active Jobs</p>
            <p className="stat-number" style={{ color: '#C9A84C' }}>{dashboard?.active_jobs || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <p className="stat-label">Revenue Today</p>
            <p className="stat-number">₹{dashboard?.revenue_today?.toLocaleString() || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👤</span>
          <div className="stat-info">
            <p className="stat-label">Total Customers</p>
            <p className="stat-number">{dashboard?.total_customers || 0}</p>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions-grid">
        <button className="quick-action-btn" onClick={() => setView('appointments')}>
          <span>📅</span>
          Appointments
        </button>
        <button className="quick-action-btn" onClick={() => setView('walkin')}>
          <span>🚶</span>
          Walk-in
        </button>
        <button className="quick-action-btn" onClick={() => setView('jobs')}>
          <span>🔧</span>
          Jobs
        </button>
        <button className="quick-action-btn" onClick={() => setView('invoices')}>
          <span>🧾</span>
          Invoices
        </button>
      </div>

      {/* NAVIGATION */}
      <div className="nav-grid">
        <button className="nav-btn" onClick={() => setView('appointments')}>📅 Appointments</button>
        <button className="nav-btn" onClick={() => setView('jobs')}>🔧 Jobs</button>
        <button className="nav-btn" onClick={() => setView('customers')}>👤 Customers</button>
        <button className="nav-btn" onClick={() => setView('invoices')}>🧾 Invoices</button>
        <button className="nav-btn" onClick={() => setView('services')}>💰 Services</button>
        <button className="nav-btn" onClick={() => setView('walkin')}>🚶 Walk-in</button>
        <button className="nav-btn" onClick={() => setView('rewards')}>🎁 Rewards</button>
      </div>

      {/* RECENT ACTIVITY */}
      {recentActivity && (
        <div className="recent-activity">
          <h3>📋 Recent Activity</h3>
          
          {recentActivity.recent_appointments?.length > 0 && (
            <div className="activity-list">
              <p className="activity-label">📅 Recent Appointments:</p>
              {recentActivity.recent_appointments.slice(0, 3).map(a => (
                <div key={a.id} className="activity-item">
                  <span>{a.customers?.full_name} - {a.service_type}</span>
                  <span className={`badge status-${a.status}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}

          {recentActivity.recent_jobs?.length > 0 && (
            <div className="activity-list">
              <p className="activity-label">🔧 Recent Jobs:</p>
              {recentActivity.recent_jobs.slice(0, 3).map(j => (
                <div key={j.id} className="activity-item">
                  <span>#{j.job_number} - {j.customers?.full_name}</span>
                  <span className={`badge status-${j.status}`}>{j.status}</span>
                </div>
              ))}
            </div>
          )}

          {recentActivity.recent_invoices?.length > 0 && (
            <div className="activity-list">
              <p className="activity-label">🧾 Recent Invoices:</p>
              {recentActivity.recent_invoices.slice(0, 3).map(inv => (
                <div key={inv.id} className="activity-item">
                  <span>{inv.customers?.full_name} - ₹{inv.total_cost?.toLocaleString()}</span>
                  <span className={`badge status-${inv.status}`}>{inv.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  // ============================================
  // RENDER APPOINTMENTS
  // ============================================
  const renderAppointments = () => (
    <>
      <div className="staff-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '2px solid #1A56DB',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Dharma Motors"
            style={{ 
              width: '30px',
              height: 'auto'
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 }}>📅 Appointments</h1>
        </div>
        <div>
          <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="empty-state">No appointments</p>
      ) : (
        appointments.map(a => (
          <div key={a.id} className="list-item">
            <div>
              <strong>{a.service_type}</strong>
              <p>{a.customers?.full_name} - {a.date}</p>
              <span className={`badge status-${a.status}`}>{a.status}</span>
            </div>
            <div className="actions">
              {a.status === 'pending' && (
                <>
                  <button 
                    className="btn-small success" 
                    onClick={() => acceptAppointment(a.id, a.customer_id, a.vehicle_id, a.service_type)}
                  >
                    ✅ Accept
                  </button>
                  <button 
                    className="btn-small danger" 
                    onClick={() => rejectAppointment(a.id)}
                  >
                    ❌ Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </>
  )

  // ============================================
  // RENDER JOBS
  // ============================================
  const renderJobs = () => {
    const statusGroups = {
      'check-in': { label: '📋 Check-in', jobs: [] },
      'diagnosis': { label: '🔍 Diagnosis', jobs: [] },
      'quotation': { label: '📄 Quotation', jobs: [] },
      'approved': { label: '✅ Approved', jobs: [] },
      'repair': { label: '🔧 Repair', jobs: [] },
      'qc': { label: '🔬 QC', jobs: [] },
      'ready': { label: '🚗 Ready', jobs: [] },
      'completed': { label: '🎉 Completed', jobs: [] }
    }

    jobs.forEach(j => {
      if (statusGroups[j.status]) {
        statusGroups[j.status].jobs.push(j)
      }
    })

    return (
      <>
        <div className="staff-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '2px solid #1A56DB',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/logo.png" 
              alt="Dharma Motors"
              style={{ 
                width: '30px',
                height: 'auto'
              }}
            />
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 }}>🔧 Service Jobs</h1>
          </div>
          <div>
            <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="empty-state">No jobs</p>
        ) : (
          Object.entries(statusGroups).map(([statusKey, group]) => {
            if (group.jobs.length === 0) return null
            return (
              <div key={statusKey} className="job-group">
                <h3 className="job-group-title">{group.label} ({group.jobs.length})</h3>
                {group.jobs.map(j => (
                  <div key={j.id} className="list-item">
                    <div>
                      <strong>#{j.job_number}</strong>
                      <p>{j.customers?.full_name} - {j.vehicles?.model}</p>
                      <p className="job-problem">{j.problem || 'No problem specified'}</p>
                      <span className={`badge status-${j.status}`}>{j.status}</span>
                    </div>
                    <div className="actions">
                      {j.status !== 'completed' && (
                        <select 
                          onChange={(e) => updateJobStatus(j.id, e.target.value)} 
                          value={j.status}
                          className="status-select"
                        >
                          <option value="check-in">📋 Check-in</option>
                          <option value="diagnosis">🔍 Diagnosis</option>
                          <option value="quotation">📄 Quotation</option>
                          <option value="approved">✅ Approved</option>
                          <option value="repair">🔧 Repair</option>
                          <option value="qc">🔬 QC</option>
                          <option value="ready">🚗 Ready</option>
                          <option value="completed">🎉 Completed</option>
                        </select>
                      )}
                      {j.status === 'completed' && (
                        <button 
                          className="btn-small primary"
                          onClick={() => openInvoiceForm(j)}
                          style={{ background: '#1A56DB', color: 'white' }}
                        >
                          🧾 Invoice
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}

        {/* Invoice Form Modal */}
        {showInvoiceForm && invoiceJob && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header" style={{ borderBottom: '2px solid #1A56DB' }}>
                <h3 style={{ color: '#1E293B' }}>🧾 Create Invoice</h3>
                <button className="modal-close" onClick={closeInvoiceForm}>✕</button>
              </div>
              <div className="modal-body">
                <div className="job-info" style={{ background: '#EFF6FF', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <p><strong>Job:</strong> #{invoiceJob.job_number}</p>
                  <p><strong>Customer:</strong> {invoiceJob.customers?.full_name}</p>
                  <p><strong>Vehicle:</strong> {invoiceJob.vehicles?.model} - {invoiceJob.vehicles?.registration}</p>
                  <p><strong>Service:</strong> {invoiceJob.problem || 'General Service'}</p>
                </div>

                <form onSubmit={createInvoice}>
                  <div className="form-group">
                    <label>Service Name</label>
                    <input
                      type="text"
                      value={invoiceData.service_name}
                      onChange={(e) => setInvoiceData({...invoiceData, service_name: e.target.value})}
                      placeholder="Service name"
                      required
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Parts Cost (₹)</label>
                      <input
                        type="number"
                        value={invoiceData.parts_cost}
                        onChange={(e) => setInvoiceData({...invoiceData, parts_cost: e.target.value})}
                        placeholder="0"
                        min="0"
                        step="100"
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: '8px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Labour Cost (₹)</label>
                      <input
                        type="number"
                        value={invoiceData.labour_cost}
                        onChange={(e) => setInvoiceData({...invoiceData, labour_cost: e.target.value})}
                        placeholder="0"
                        min="0"
                        step="100"
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: '8px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Diagnostics Cost (₹)</label>
                    <input
                      type="number"
                      value={invoiceData.diagnostics_cost}
                      onChange={(e) => setInvoiceData({...invoiceData, diagnostics_cost: e.target.value})}
                      placeholder="0"
                      min="0"
                      step="50"
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="modal-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#EFF6FF', borderRadius: '8px', marginBottom: '16px' }}>
                    <span>Total Amount</span>
                    <strong style={{ color: '#1A56DB', fontSize: '20px' }}>₹{(parseFloat(invoiceData.parts_cost) || 0) + (parseFloat(invoiceData.labour_cost) || 0) + (parseFloat(invoiceData.diagnostics_cost) || 0)}</strong>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading} style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1A56DB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    {loading ? 'Creating...' : '✅ Create Invoice'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ============================================
  // RENDER CUSTOMERS
  // ============================================
  const renderCustomers = () => (
    <>
      <div className="staff-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '2px solid #1A56DB',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Dharma Motors"
            style={{ 
              width: '30px',
              height: 'auto'
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 }}>👤 Customers</h1>
        </div>
        <div>
          <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
        </div>
      </div>

      {customers.length === 0 ? (
        <p className="empty-state">No customers</p>
      ) : (
        customers.map(c => (
          <div key={c.id} className="list-item">
            <strong>{c.full_name}</strong>
            <p>📱 {c.mobile}</p>
            <p className="customer-email">{c.email || 'No email'}</p>
          </div>
        ))
      )}
    </>
  )

  // ============================================
  // RENDER INVOICES
  // ============================================
  const renderInvoices = () => (
    <>
      <div className="staff-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '2px solid #1A56DB',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Dharma Motors"
            style={{ 
              width: '30px',
              height: 'auto'
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 }}>🧾 Invoices</h1>
        </div>
        <div>
          <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="empty-state">No invoices</p>
      ) : (
        invoices.map(inv => (
          <div key={inv.id} className="invoice-card">
            <div className="invoice-header">
              <span className="invoice-number">#{inv.id.slice(0, 8).toUpperCase()}</span>
              <span className={`badge status-${inv.status}`}>{inv.status}</span>
            </div>
            <div className="invoice-body">
              <p><strong>{inv.customers?.full_name}</strong></p>
              <p className="invoice-service">{inv.service_name || 'Service'}</p>
              <div className="invoice-costs">
                <span>Parts: ₹{inv.parts_cost?.toLocaleString() || 0}</span>
                <span>Labour: ₹{inv.labour_cost?.toLocaleString() || 0}</span>
                <span>Diag: ₹{inv.diagnostics_cost?.toLocaleString() || 0}</span>
              </div>
              <p className="invoice-total">Total: ₹{inv.total_cost?.toLocaleString()}</p>
            </div>
            {inv.status === 'pending' && (
              <div className="invoice-actions">
                <button className="btn-small success" onClick={() => markInvoicePaid(inv.id)}>
                  💰 Mark Paid
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  )

  // ============================================
  // RENDER REWARDS
  // ============================================
  const renderRewards = () => (
    <>
      <div className="staff-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '2px solid #1A56DB',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Dharma Motors"
            style={{ 
              width: '30px',
              height: 'auto'
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 }}>🎁 Rewards Management</h1>
        </div>
        <div>
          <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
        </div>
      </div>

      <div className="card">
        <h3>Create New Reward</h3>
        <form onSubmit={createReward} className="walkin-form">
          <input
            type="text"
            placeholder="Reward Name *"
            value={rewardForm.name}
            onChange={(e) => setRewardForm({...rewardForm, name: e.target.value})}
            required
          />
          <textarea
            placeholder="Description"
            value={rewardForm.description}
            onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})}
            rows="2"
            style={{ width: '100%', padding: '10px', border: '2px solid #E2E8F0', borderRadius: '8px' }}
          />
          <input
            type="number"
            placeholder="Points Required *"
            value={rewardForm.points_required}
            onChange={(e) => setRewardForm({...rewardForm, points_required: e.target.value})}
            required
          />
          <button type="submit" className="submit-btn" disabled={loading} style={{
            width: '100%',
            padding: '12px',
            background: '#1A56DB',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            {loading ? 'Creating...' : 'Create Reward'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Available Rewards</h3>
        {rewardsCatalog.length === 0 ? (
          <p className="empty-state">No rewards created yet</p>
        ) : (
          rewardsCatalog.map(r => (
            <div key={r.id} className="list-item">
              <strong>{r.name}</strong>
              <p>{r.description}</p>
              <p style={{ fontWeight: 'bold', color: '#1A56DB' }}>⭐ {r.points_required} points</p>
              <span className={`badge ${r.is_active !== false ? 'status-paid' : 'status-cancelled'}`}>
                {r.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  )

  // ============================================
  // RENDER WALK-IN
  // ============================================
  const renderWalkIn = () => (
    <>
      <div className="staff-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '2px solid #1A56DB',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Dharma Motors"
            style={{ 
              width: '30px',
              height: 'auto'
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', margin: 0 }}>🚶 Walk-in Customer</h1>
        </div>
        <div>
          <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
        </div>
      </div>

      <div className="walkin-form">
        <h3>Customer Details</h3>
        <form onSubmit={createWalkInCustomer}>
          <input
            type="text"
            placeholder="Full Name *"
            value={customerForm.full_name}
            onChange={(e) => setCustomerForm({...customerForm, full_name: e.target.value})}
            required
          />
          <input
            type="tel"
            placeholder="Mobile Number *"
            value={customerForm.mobile}
            onChange={(e) => setCustomerForm({...customerForm, mobile: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={customerForm.email}
            onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
          />

          <h3>Vehicle Details</h3>
          <input
            type="text"
            placeholder="Registration *"
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
            placeholder="Fuel (Petrol/Diesel)"
            value={vehicleForm.fuel}
            onChange={(e) => setVehicleForm({...vehicleForm, fuel: e.target.value})}
          />
          <input
            type="number"
            placeholder="Current KM"
            value={vehicleForm.current_km}
            onChange={(e) => setVehicleForm({...vehicleForm, current_km: e.target.value})}
          />

          <button type="submit" className="submit-btn" disabled={loading} style={{
            width: '100%',
            padding: '12px',
            background: '#1A56DB',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            {loading ? 'Creating...' : 'Create Customer & Vehicle'}
          </button>
        </form>
      </div>
    </>
  )

  // ============================================
  // MAIN RETURN
  // ============================================
  return (
    <div className="staff-app">
      {view === 'dashboard' && renderDashboard()}
      {view === 'appointments' && renderAppointments()}
      {view === 'jobs' && renderJobs()}
      {view === 'customers' && renderCustomers()}
      {view === 'invoices' && renderInvoices()}
      {view === 'services' && <ServiceManagement />}
      {view === 'walkin' && renderWalkIn()}
      {view === 'rewards' && renderRewards()}
    </div>
  )
}

export default StaffApp