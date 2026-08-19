// backend/routes/staff.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// DASHBOARD SUMMARY
// ============================================
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's appointments
    const { data: appointments, error: appError } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', today);

    if (appError) throw appError;

    // Active jobs (not completed)
    const { data: activeJobs, error: jobError } = await supabase
      .from('service_jobs')
      .select('*')
      .neq('status', 'completed');

    if (jobError) throw jobError;

    // Today's revenue
    const { data: todayInvoices, error: invError } = await supabase
      .from('invoices')
      .select('total_cost')
      .eq('status', 'paid')
      .gte('created_at', today);

    if (invError) throw invError;

    const revenue = todayInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_cost || 0), 0);

    // Total customers
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id');

    if (custError) throw custError;

    // Today's completed jobs
    const { data: completedToday, error: compError } = await supabase
      .from('service_jobs')
      .select('id')
      .eq('status', 'completed')
      .gte('created_at', today);

    if (compError) throw compError;

    // Pending appointments
    const { data: pendingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('status', 'pending');

    res.json({
      success: true,
      dashboard: {
        appointments_today: appointments?.length || 0,
        active_jobs: activeJobs?.length || 0,
        revenue_today: revenue,
        total_customers: customers?.length || 0,
        completed_today: completedToday?.length || 0,
        pending_appointments: pendingAppointments?.length || 0
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// TODAY'S APPOINTMENTS (with details)
// ============================================
router.get('/today-appointments', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model)
      `)
      .eq('date', today)
      .order('time', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      appointments: data || []
    });
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// RECENT ACTIVITY
// ============================================
router.get('/recent-activity', async (req, res) => {
  try {
    // Recent appointments (last 5)
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Recent jobs (last 5)
    const { data: jobs } = await supabase
      .from('service_jobs')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Recent invoices (last 5)
    const { data: invoices } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (id, full_name, mobile),
        vehicles (id, registration, model)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      recent_appointments: appointments || [],
      recent_jobs: jobs || [],
      recent_invoices: invoices || []
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;