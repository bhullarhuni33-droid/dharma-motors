// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - Allow all origins for now
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// STAFF LOGIN
// ============================================
app.post('/api/auth/staff-login', async (req, res) => {
  try {
    console.log('📥 Staff login attempt:', req.body.mobile);
    
    const { mobile, password, staff_password } = req.body;

    if (!mobile || !password || !staff_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const STAFF_PASSWORD = 'armnbhullar3354';
    
    if (staff_password !== STAFF_PASSWORD) {
      return res.status(401).json({ error: 'Invalid staff credentials' });
    }

    const { data: customer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (customer.role !== 'staff') {
      await supabase
        .from('customers')
        .update({ role: 'staff' })
        .eq('id', customer.id);
      customer.role = 'staff';
    }

    const token = jwt.sign(
      { id: customer.id, mobile: customer.mobile, role: customer.role },
      process.env.JWT_SECRET || 'armnbhullar3354',
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

// ============================================
// REGULAR LOGIN
// ============================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ error: 'Mobile and password required' });
    }

    const { data: customer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: customer.id, mobile: customer.mobile, role: customer.role || 'customer' },
      process.env.JWT_SECRET || 'armnbhullar3354',
      { expiresIn: '7d' }
    );

    delete customer.password;

    res.json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: customer
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// REGISTER
// ============================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, mobile, email, password } = req.body;

    if (!full_name || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: customer, error: insertError } = await supabase
      .from('customers')
      .insert([
        { 
          full_name, 
          mobile, 
          email: email || null,
          password: hashedPassword,
          role: 'customer'
        }
      ])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create account' });
    }

    const token = jwt.sign(
      { id: customer.id, mobile: customer.mobile, role: 'customer' },
      process.env.JWT_SECRET || 'armnbhullar3354',
      { expiresIn: '7d' }
    );

    delete customer.password;

    res.status(201).json({
      success: true,
      message: 'Account created!',
      token: token,
      user: customer
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// IMPORT ROUTES
// ============================================
const customerRoutes = require('./backend/routes/customers');
const vehicleRoutes = require('./backend/routes/vehicles');
const appointmentRoutes = require('./backend/routes/appointments');
const serviceJobRoutes = require('./backend/routes/serviceJobs');
const invoiceRoutes = require('./backend/routes/invoices');
const rewardRoutes = require('./backend/routes/rewards');
const reminderRoutes = require('./backend/routes/reminders');
const healthPassportRoutes = require('./backend/routes/healthpassport');
const serviceRoutes = require('./backend/routes/services');
const staffRoutes = require('./backend/routes/staff');

// ============================================
// USE ROUTES
// ============================================
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/jobs', serviceJobRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/passport', healthPassportRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);

// ============================================
// TEST ROUTE
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🚗 Workshop API is running!',
    status: '✅ Ready'
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔐 Staff Password: armnbhullar3354`);
});