// backend/routes/invoices.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// CREATE INVOICE (FIXED)
// ============================================
router.post('/create', async (req, res) => {
  try {
    console.log('📥 Incoming invoice data:', req.body);

    const { 
      service_job_id, 
      customer_id, 
      vehicle_id, 
      parts_cost, 
      labour_cost, 
      diagnostics_cost,
      service_name
    } = req.body;

    // Validate required fields
    if (!customer_id) {
      console.log('❌ Missing customer_id');
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    if (!vehicle_id) {
      console.log('❌ Missing vehicle_id');
      return res.status(400).json({ error: 'Vehicle ID is required' });
    }

    const parts = parseFloat(parts_cost) || 0;
    const labour = parseFloat(labour_cost) || 0;
    const diagnostics = parseFloat(diagnostics_cost) || 0;
    const total = parts + labour + diagnostics;

    console.log('💰 Total calculated:', total);

    // Check if customer exists
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .single();

    if (custError || !customer) {
      console.log('❌ Customer not found:', customer_id);
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if vehicle exists
    const { data: vehicle, error: vehError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicle_id)
      .single();

    if (vehError || !vehicle) {
      console.log('❌ Vehicle not found:', vehicle_id);
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Handle service_job_id - if it's manual or doesn't exist
    let jobId = service_job_id;
    
    if (!jobId || jobId === 'manual' || jobId.startsWith('manual-') || jobId === 'undefined') {
      // Create a new service job
      console.log('🔄 Creating new service job...');
      const { data: newJob, error: jobError } = await supabase
        .from('service_jobs')
        .insert([
          { 
            customer_id, 
            vehicle_id, 
            problem: service_name || 'Manual Service',
            status: 'completed',
            job_number: `JOB-MANUAL-${Date.now().toString().slice(-6)}`
          }
        ])
        .select()
        .single();

      if (jobError) {
        console.error('❌ Job creation error:', jobError);
        return res.status(500).json({ error: 'Failed to create job', details: jobError.message });
      }
      jobId = newJob.id;
      console.log('✅ Created new job:', jobId);
    }

    // Insert invoice
    console.log('📝 Creating invoice with jobId:', jobId);
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert([
        { 
          service_job_id: jobId,
          customer_id,
          vehicle_id,
          service_name: service_name || 'Service',
          parts_cost: parts,
          labour_cost: labour,
          diagnostics_cost: diagnostics,
          total_cost: total,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Invoice insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create invoice', details: insertError.message });
    }

    console.log('✅ Invoice created:', invoice.id);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully!',
      invoice: invoice
    });

  } catch (error) {
    console.error('❌ Create invoice error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ============================================
// GET ALL INVOICES
// ============================================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model),
        service_jobs (id, job_number, problem)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      invoices: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GET INVOICES BY CUSTOMER
// ============================================
router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vehicles (id, registration, model),
        service_jobs (id, job_number)
      `)
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      invoices: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// MARK INVOICE AS PAID
// ============================================
router.patch('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_mode } = req.body;

    if (!payment_mode) {
      return res.status(400).json({ error: 'Payment mode is required' });
    }

    const validModes = ['cash', 'upi', 'card', 'bank', 'other'];
    if (!validModes.includes(payment_mode)) {
      return res.status(400).json({ 
        error: 'Invalid payment mode. Must be: cash, upi, card, bank, other' 
      });
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        status: 'paid',
        payment_mode: payment_mode,
        paid_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Add reward points (10 points per ₹100 spent)
    const pointsToAdd = Math.floor(data.total_cost / 10);
    if (pointsToAdd > 0) {
      try {
        const { data: rewards } = await supabase
          .from('rewards')
          .select('*')
          .eq('customer_id', data.customer_id)
          .single();

        if (rewards) {
          await supabase
            .from('rewards')
            .update({ 
              points: (rewards.points || 0) + pointsToAdd,
              total_points_earned: (rewards.total_points_earned || 0) + pointsToAdd
            })
            .eq('customer_id', data.customer_id);
        } else {
          await supabase
            .from('rewards')
            .insert([
              { 
                customer_id: data.customer_id,
                points: pointsToAdd,
                total_points_earned: pointsToAdd
              }
            ]);
        }
        console.log(`✅ Added ${pointsToAdd} reward points to customer ${data.customer_id}`);
      } catch (rewardError) {
        console.error('Reward points error:', rewardError);
      }
    }

    res.json({
      success: true,
      message: 'Invoice marked as paid!',
      invoice: data
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;