// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS - Allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// ✅ HARDCODED ADMIN CREDENTIALS
// ============================================
const ADMIN_MOBILE = '7696707446';
const ADMIN_PASSWORD = 'armnbhullar3354';
const STAFF_SECRET_KEY = 'armnbhullar3354';

// ============================================
// STAFF LOGIN (Only for admin)
// ============================================
app.post('/api/auth/staff-login', async (req, res) => {
  try {
    console.log('📥 Staff login attempt:', req.body.mobile);
    
    const { mobile, password, staff_password } = req.body;

    if (!mobile || !password || !staff_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ✅ Check if mobile matches admin
    if (mobile !== ADMIN_MOBILE) {
      console.log('❌ Not admin mobile:', mobile);
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // ✅ Check staff secret key
    if (staff_password !== STAFF_SECRET_KEY) {
      console.log('❌ Wrong staff key');
      return res.status(401).json({ error: 'Invalid staff credentials' });
    }

    // ✅ Check password
    if (password !== ADMIN_PASSWORD) {
      console.log('❌ Wrong password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Find or create admin in database
    let { data: customer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    // If admin doesn't exist, create them
    if (!customer) {
      console.log('🔄 Creating admin account...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([
          { 
            full_name: 'Admin',
            mobile: mobile,
            email: 'admin@workshop.com',
            password: hashedPassword,
            role: 'staff'
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create admin' });
      }
      customer = newCustomer;
      console.log('✅ Admin account created!');
    } else {
      // Ensure admin has staff role
      if (customer.role !== 'staff') {
        await supabase
          .from('customers')
          .update({ role: 'staff' })
          .eq('id', customer.id);
        customer.role = 'staff';
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: customer.id, mobile: customer.mobile, role: 'staff' },
      process.env.JWT_SECRET || 'armnbhullar3354',
      { expiresIn: '7d' }
    );

    delete customer.password;

    console.log('✅ Admin login successful!');

    res.json({
      success: true,
      message: 'Admin login successful!',
      token: token,
      user: customer
    });

  } catch (error) {
    console.error('❌ Staff login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// REGULAR LOGIN (For customers)
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
// REGISTER (For customers)
// ============================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, mobile, email, password } = req.body;

    if (!full_name || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Customer already exists' });
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
// IMPORT OTHER ROUTES
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

app.get('/', (req, res) => {
  res.json({ message: '🚗 Workshop API is running!' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔐 Admin Mobile: 7696707446`);
  console.log(`🔐 Admin Password: armnbhullar3354`);
});