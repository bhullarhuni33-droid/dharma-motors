// backend/routes/appointments.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.post('/book', async (req, res) => {
  try {
    const { customer_id, vehicle_id, service_type, date, time, notes } = req.body;

    // If no time, set default
    const appointmentTime = time || '10:00:00';

    const { data, error } = await supabase
      .from('appointments')
      .insert([
        { 
          customer_id, 
          vehicle_id, 
          service_type, 
          date, 
          time: appointmentTime,
          status: 'pending'
        }
      ])
      .select()
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

    // Insert appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert([
        { 
          customer_id, 
          vehicle_id, 
          service_type, 
          date, 
          time,
          status: 'pending',
          notes: notes || null
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: {
        ...appointment,
        customer: customer,
        vehicle: vehicle
      }
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET ALL APPOINTMENTS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model)
      `)
      .order('date', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      appointments: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET APPOINTMENTS BY CUSTOMER
router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        vehicles (id, registration, model)
      `)
      .eq('customer_id', customer_id)
      .order('date', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      appointments: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching customer appointments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE APPOINTMENT STATUS
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Valid statuses
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: pending, confirmed, completed, cancelled' 
      });
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      success: true,
      message: `Appointment ${status} successfully!`,
      appointment: data
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET APPOINTMENT BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (id, full_name, mobile, email),
        vehicles (id, registration, model, type, fuel)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      success: true,
      appointment: data
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;