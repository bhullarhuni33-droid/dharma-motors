import React, { useState } from 'react';
import './InvoiceModal.css';

function InvoiceModal({ job, onClose, onCreateInvoice }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    parts_cost: '',
    labour_cost: '',
    diagnostics_cost: '',
    service_name: job?.problem || 'Service'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parts = parseFloat(formData.parts_cost) || 0;
    const labour = parseFloat(formData.labour_cost) || 0;
    const diagnostics = parseFloat(formData.diagnostics_cost) || 0;
    
    if (parts === 0 && labour === 0 && diagnostics === 0) {
      alert('Please enter at least one cost');
      return;
    }

    setLoading(true);
    
    try {
      console.log('📤 Sending invoice data:', {
        service_job_id: job.id,
        customer_id: job.customer_id,
        vehicle_id: job.vehicle_id,
        parts_cost: parts,
        labour_cost: labour,
        diagnostics_cost: diagnostics,
        service_name: formData.service_name
      });

      await onCreateInvoice({
        service_job_id: job.id,
        customer_id: job.customer_id,
        vehicle_id: job.vehicle_id,
        parts_cost: parts,
        labour_cost: labour,
        diagnostics_cost: diagnostics,
        service_name: formData.service_name
      });
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      alert('❌ Failed to create invoice. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total
  const parts = parseFloat(formData.parts_cost) || 0;
  const labour = parseFloat(formData.labour_cost) || 0;
  const diagnostics = parseFloat(formData.diagnostics_cost) || 0;
  const total = parts + labour + diagnostics;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🧾 Create Invoice</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="job-info">
            <p><strong>Job:</strong> #{job?.job_number}</p>
            <p><strong>Customer:</strong> {job?.customers?.full_name}</p>
            <p><strong>Vehicle:</strong> {job?.vehicles?.model} - {job?.vehicles?.registration}</p>
            <p><strong>Service:</strong> {job?.problem || 'General Service'}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Service Name</label>
              <input
                type="text"
                value={formData.service_name}
                onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                placeholder="Service name"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Parts Cost (₹)</label>
                <input
                  type="number"
                  value={formData.parts_cost}
                  onChange={(e) => setFormData({...formData, parts_cost: e.target.value})}
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-group">
                <label>Labour Cost (₹)</label>
                <input
                  type="number"
                  value={formData.labour_cost}
                  onChange={(e) => setFormData({...formData, labour_cost: e.target.value})}
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Diagnostics Cost (₹)</label>
              <input
                type="number"
                value={formData.diagnostics_cost}
                onChange={(e) => setFormData({...formData, diagnostics_cost: e.target.value})}
                placeholder="0"
                min="0"
                step="50"
              />
            </div>

            <div className="modal-total">
              <span>Total Amount</span>
              <strong>₹{total.toLocaleString()}</strong>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating...' : '✅ Create Invoice'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;