// backend/routes/staffAuth.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// STAFF LOGIN (with special password)
router.post('/staff-login', async (req, res) => {
  try {
    const { mobile, password, staff_password } = req.body;

    if (!mobile || !password || !staff_password) {
      return res.status(400).json({ error: 'Mobile, password, and staff key are required' });
    }

    // Check staff password
    const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'admin123';
    
    if (staff_password !== STAFF_PASSWORD) {
      return res.status(401).json({ error: 'Invalid staff credentials' });
    }

    // Find customer by mobile
    const { data: customer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Make sure user is staff (or upgrade them)
    if (customer.role !== 'staff') {
      // Upgrade to staff
      await supabase
        .from('customers')
        .update({ role: 'staff' })
        .eq('id', customer.id);
      customer.role = 'staff';
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: customer.id, mobile: customer.mobile, role: customer.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    delete customer.password;

    res.json({
      success: true,
      message: 'Staff login successful!',
      token: token,
      user: customer
    });

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;