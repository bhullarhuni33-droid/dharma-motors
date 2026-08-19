// backend/routes/customers.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// REGISTER NEW CUSTOMER
router.post('/register', async (req, res) => {
  try {
    const { full_name, mobile, email } = req.body;

    // Check if required fields exist
    if (!full_name || !mobile) {
      return res.status(400).json({ 
        error: 'Full name and mobile number are required' 
      });
    }

    // Check if customer already exists
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (existingCustomer) {
      return res.status(400).json({ 
        error: 'Customer with this mobile number already exists',
        customer: existingCustomer
      });
    }

    // Insert new customer
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert([
        { 
          full_name, 
          mobile, 
          email: email || null 
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully!',
      customer: newCustomer
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET ALL CUSTOMERS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      customers: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET CUSTOMER BY MOBILE NUMBER
router.get('/mobile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (error) {
      return res.status(404).json({ 
        success: false,
        message: 'Customer not found' 
      });
    }

    res.json({
      success: true,
      customer: data
    });
  } catch (error) {
    console.error('Error finding customer:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;