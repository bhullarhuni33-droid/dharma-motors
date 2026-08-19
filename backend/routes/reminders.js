// backend/routes/reminders.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// GENERATE REMINDERS FOR ALL VEHICLES
// ============================================
router.get('/generate', async (req, res) => {
  try {
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        customers (id, full_name, mobile, email)
      `);

    if (vehicleError) throw vehicleError;

    const reminders = [];
    const now = new Date();

    for (const vehicle of vehicles) {
      // Get last completed service for this vehicle
      const { data: lastService } = await supabase
        .from('service_jobs')
        .select('created_at, status, problem, job_number')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      let daysSinceLastService = null;
      let reminderMessage = null;
      let reminderLevel = 'info';

      if (lastService && lastService.length > 0) {
        const lastServiceDate = new Date(lastService[0].created_at);
        const daysDiff = Math.floor((now - lastServiceDate) / (1000 * 60 * 60 * 24));
        daysSinceLastService = daysDiff;

        // Check if due for service (30, 60, 90 days)
        if (daysDiff >= 90) {
          reminderMessage = `⚠️ OVERDUE! Your ${vehicle.model} hasn't been serviced in ${daysDiff} days. Book immediately!`;
          reminderLevel = 'critical';
        } else if (daysDiff >= 60) {
          reminderMessage = `🔔 Service due soon! Your ${vehicle.model} was last serviced ${daysDiff} days ago. Book now.`;
          reminderLevel = 'warning';
        } else if (daysDiff >= 30) {
          reminderMessage = `📅 Time for maintenance check. Your ${vehicle.model} was last serviced ${daysDiff} days ago.`;
          reminderLevel = 'info';
        }
      } else {
        // No service history - welcome reminder
        reminderMessage = `🆕 Welcome! Get your first service check for ${vehicle.model}`;
        daysSinceLastService = 'No service history';
        reminderLevel = 'welcome';
      }

      if (reminderMessage) {
        reminders.push({
          vehicle_id: vehicle.id,
          customer_id: vehicle.customer_id,
          customer_name: vehicle.customers?.full_name || 'Unknown',
          customer_mobile: vehicle.customers?.mobile || 'No mobile',
          customer_email: vehicle.customers?.email || 'No email',
          registration: vehicle.registration,
          model: vehicle.model,
          days_since_last_service: daysSinceLastService,
          message: reminderMessage,
          level: reminderLevel,
          last_service: lastService && lastService.length > 0 ? lastService[0] : null
        });
      }
    }

    res.json({
      success: true,
      reminders: reminders,
      count: reminders.length,
      message: 'Reminders generated successfully!'
    });
  } catch (error) {
    console.error('Generate reminders error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ============================================
// GET REMINDERS FOR A CUSTOMER
// ============================================
router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    // Get all vehicles for this customer
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        customers (id, full_name, mobile, email)
      `)
      .eq('customer_id', customer_id);

    if (vehicleError) throw vehicleError;

    const reminders = [];
    const now = new Date();

    for (const vehicle of vehicles) {
      // Get last completed service
      const { data: lastService } = await supabase
        .from('service_jobs')
        .select('created_at, status, problem, job_number')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      let daysSinceLastService = null;
      let reminderMessage = null;
      let reminderLevel = 'info';

      if (lastService && lastService.length > 0) {
        const lastServiceDate = new Date(lastService[0].created_at);
        const daysDiff = Math.floor((now - lastServiceDate) / (1000 * 60 * 60 * 24));
        daysSinceLastService = daysDiff;

        if (daysDiff >= 90) {
          reminderMessage = `⚠️ OVERDUE! Last service was ${daysDiff} days ago.`;
          reminderLevel = 'critical';
        } else if (daysDiff >= 60) {
          reminderMessage = `🔔 Service due soon! Last service was ${daysDiff} days ago.`;
          reminderLevel = 'warning';
        } else if (daysDiff >= 30) {
          reminderMessage = `📅 Maintenance check due. Last service was ${daysDiff} days ago.`;
          reminderLevel = 'info';
        }
      } else {
        reminderMessage = `🆕 Get your first service check for ${vehicle.model}`;
        daysSinceLastService = 'No service history';
        reminderLevel = 'welcome';
      }

      if (reminderMessage) {
        reminders.push({
          vehicle_id: vehicle.id,
          registration: vehicle.registration,
          model: vehicle.model,
          days_since_last_service: daysSinceLastService,
          message: reminderMessage,
          level: reminderLevel,
          last_service: lastService && lastService.length > 0 ? lastService[0] : null
        });
      }
    }

    res.json({
      success: true,
      customer_id: customer_id,
      reminders: reminders,
      count: reminders.length
    });
  } catch (error) {
    console.error('Error fetching customer reminders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GET OVERDUE VEHICLES (Staff Dashboard)
// ============================================
router.get('/overdue', async (req, res) => {
  try {
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        customers (id, full_name, mobile, email)
      `);

    if (vehicleError) throw vehicleError;

    const overdue = [];
    const now = new Date();

    for (const vehicle of vehicles) {
      const { data: lastService } = await supabase
        .from('service_jobs')
        .select('created_at')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastService && lastService.length > 0) {
        const lastServiceDate = new Date(lastService[0].created_at);
        const daysDiff = Math.floor((now - lastServiceDate) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 60) {
          overdue.push({
            vehicle_id: vehicle.id,
            customer_id: vehicle.customer_id,
            customer_name: vehicle.customers?.full_name || 'Unknown',
            customer_mobile: vehicle.customers?.mobile || 'No mobile',
            registration: vehicle.registration,
            model: vehicle.model,
            days_since_last_service: daysDiff,
            status: daysDiff >= 90 ? 'Critical' : 'Warning'
          });
        }
      }
    }

    res.json({
      success: true,
      overdue: overdue,
      count: overdue.length
    });
  } catch (error) {
    console.error('Error fetching overdue vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GET REMINDER SUMMARY STATS (Staff Dashboard)
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id');

    if (vehicleError) throw vehicleError;

    let critical = 0;
    let warning = 0;
    let info = 0;
    let noService = 0;
    const now = new Date();

    for (const vehicle of vehicles) {
      const { data: lastService } = await supabase
        .from('service_jobs')
        .select('created_at')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastService && lastService.length > 0) {
        const lastServiceDate = new Date(lastService[0].created_at);
        const daysDiff = Math.floor((now - lastServiceDate) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 90) {
          critical++;
        } else if (daysDiff >= 60) {
          warning++;
        } else if (daysDiff >= 30) {
          info++;
        }
      } else {
        noService++;
      }
    }

    res.json({
      success: true,
      stats: {
        critical: critical,
        warning: warning,
        info: info,
        no_service: noService,
        total: vehicles.length
      }
    });
  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;