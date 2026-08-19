// backend/routes/vehicles.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ADD VEHICLE TO CUSTOMER
router.post('/add', async (req, res) => {
  try {
    const { customer_id, registration, model, type, fuel, current_km } = req.body;

    // Check required fields
    if (!customer_id || !registration || !model) {
      return res.status(400).json({ 
        error: 'Customer ID, registration, and model are required' 
      });
    }

    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if vehicle already exists (by registration)
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('registration', registration)
      .single();

    if (existingVehicle) {
      return res.status(400).json({ 
        error: 'Vehicle with this registration already exists' 
      });
    }

    // Insert vehicle
    const { data: vehicle, error: insertError } = await supabase
      .from('vehicles')
      .insert([
        { 
          customer_id, 
          registration, 
          model, 
          type: type || null,
          fuel: fuel || null,
          current_km: current_km || null
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully!',
      vehicle: vehicle
    });

  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET VEHICLES BY CUSTOMER ID
router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customer_id);

    if (error) throw error;

    res.json({
      success: true,
      vehicles: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ALL VEHICLES
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*');

    if (error) throw error;

    res.json({
      success: true,
      vehicles: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;