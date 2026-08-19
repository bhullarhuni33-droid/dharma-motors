// backend/routes/serviceJobs.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// CREATE SERVICE JOB (Check-in)
router.post('/create', async (req, res) => {
  try {
    const { customer_id, vehicle_id, problem } = req.body;

    // Check required fields
    if (!customer_id || !vehicle_id) {
      return res.status(400).json({ 
        error: 'Customer ID and Vehicle ID are required' 
      });
    }

    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, mobile')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if vehicle exists and belongs to customer
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, registration, model')
      .eq('id', vehicle_id)
      .eq('customer_id', customer_id)
      .single();

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found or does not belong to customer' });
    }

    // Generate job number (e.g., JOB-2026-001)
    const { data: lastJob } = await supabase
      .from('service_jobs')
      .select('job_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let jobNumber = 'JOB-2026-001';
    if (lastJob && lastJob.length > 0) {
      const lastNum = parseInt(lastJob[0].job_number.split('-')[2]);
      const newNum = String(lastNum + 1).padStart(3, '0');
      jobNumber = `JOB-2026-${newNum}`;
    }

    // Insert service job
    const { data: job, error: insertError } = await supabase
      .from('service_jobs')
      .insert([
        { 
          customer_id, 
          vehicle_id, 
          job_number: jobNumber,
          problem: problem || null,
          status: 'check-in'
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      success: true,
      message: 'Service job created successfully!',
      job: {
        ...job,
        customer: customer,
        vehicle: vehicle
      }
    });

  } catch (error) {
    console.error('Create service job error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET ALL SERVICE JOBS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_jobs')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      jobs: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET SERVICE JOB BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('service_jobs')
      .select(`
        *,
        customers (id, full_name, mobile, email),
        vehicles (id, registration, model, type, fuel, current_km)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Service job not found' });
    }

    res.json({
      success: true,
      job: data
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE JOB STATUS
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Valid statuses
    const validStatuses = ['check-in', 'diagnosis', 'quotation', 'approved', 'repair', 'qc', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: check-in, diagnosis, quotation, approved, repair, qc, ready, completed' 
      });
    }

    const { data, error } = await supabase
      .from('service_jobs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Service job not found' });
    }

    res.json({
      success: true,
      message: `Job status updated to ${status}!`,
      job: data
    });

  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADD DIAGNOSIS
router.patch('/:id/diagnosis', async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ error: 'Diagnosis is required' });
    }

    const { data, error } = await supabase
      .from('service_jobs')
      .update({ 
        diagnosis: diagnosis,
        status: 'diagnosis'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Service job not found' });
    }

    res.json({
      success: true,
      message: 'Diagnosis added successfully!',
      job: data
    });

  } catch (error) {
    console.error('Add diagnosis error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET JOBS BY CUSTOMER
router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    const { data, error } = await supabase
      .from('service_jobs')
      .select(`
        *,
        vehicles (id, registration, model)
      `)
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      jobs: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching customer jobs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;