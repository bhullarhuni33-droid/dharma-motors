// backend/routes/healthpassport.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET VEHICLE HEALTH PASSPORT
router.get('/:vehicle_id', async (req, res) => {
  try {
    const { vehicle_id } = req.params;

    // Get vehicle details
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        customers (id, full_name, mobile, email)
      `)
      .eq('id', vehicle_id)
      .single();

    if (vehicleError) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Get all service jobs for this vehicle
    const { data: jobs, error: jobsError } = await supabase
      .from('service_jobs')
      .select(`
        *,
        invoices (id, total_cost, status, payment_mode, paid_at),
        appointments (id, service_type, date, time)
      `)
      .eq('vehicle_id', vehicle_id)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // Get all invoices for this vehicle
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('vehicle_id', vehicle_id);

    // Calculate statistics
    const totalVisits = jobs?.length || 0;
    const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
    const totalSpent = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_cost || 0), 0) || 0;

    // Get last service
    const lastService = jobs && jobs.length > 0 ? jobs[0] : null;

    // Group by service type
    const serviceTypes = {};
    jobs?.forEach(job => {
      const type = job.appointments?.service_type || 'General';
      serviceTypes[type] = (serviceTypes[type] || 0) + 1;
    });

    // Get upcoming maintenance (based on KM)
    const currentKm = vehicle.current_km || 0;
    const nextServiceKm = currentKm + 5000; // Every 5000 km
    const nextServiceDate = new Date();
    nextServiceDate.setMonth(nextServiceDate.getMonth() + 6); // Every 6 months

    // Check if any active service
    const activeService = jobs?.find(j => ['check-in', 'diagnosis', 'quotation', 'approved', 'repair', 'qc'].includes(j.status));

    // Get service categories status
    const categories = {
      'Engine': { status: 'good', label: '✅ Good' },
      'Brakes': { status: 'good', label: '✅ Good' },
      'Electrical': { status: 'good', label: '✅ Good' },
      'Cooling': { status: 'good', label: '✅ Good' },
      'Transmission': { status: 'good', label: '✅ Good' }
    };

    // If there's a job with diagnosis, check for issues
    jobs?.forEach(job => {
      if (job.diagnosis) {
        const diag = job.diagnosis.toLowerCase();
        if (diag.includes('brake')) categories['Brakes'] = { status: 'warning', label: '⚠️ Check' };
        if (diag.includes('engine')) categories['Engine'] = { status: 'warning', label: '⚠️ Check' };
        if (diag.includes('electrical') || diag.includes('battery')) {
          categories['Electrical'] = { status: 'warning', label: '⚠️ Check' };
        }
        if (diag.includes('cooling') || diag.includes('radiator')) {
          categories['Cooling'] = { status: 'warning', label: '⚠️ Check' };
        }
        if (diag.includes('transmission') || diag.includes('gear')) {
          categories['Transmission'] = { status: 'warning', label: '⚠️ Check' };
        }
      }
    });

    res.json({
      success: true,
      health_passport: {
        vehicle: {
          id: vehicle.id,
          registration: vehicle.registration,
          model: vehicle.model,
          type: vehicle.type || 'Not specified',
          fuel: vehicle.fuel || 'Not specified',
          current_km: vehicle.current_km || 0,
          customer: vehicle.customers
        },
        summary: {
          total_visits: totalVisits,
          completed_services: completedJobs,
          total_spent: totalSpent,
          last_service: lastService ? {
            date: lastService.created_at,
            status: lastService.status,
            problem: lastService.problem,
            diagnosis: lastService.diagnosis,
            job_number: lastService.job_number
          } : null,
          active_service: activeService ? {
            status: activeService.status,
            job_number: activeService.job_number,
            problem: activeService.problem
          } : null
        },
        maintenance: {
          next_service_km: nextServiceKm,
          next_service_date: nextServiceDate.toISOString().split('T')[0],
          km_until_service: nextServiceKm - currentKm
        },
        categories: categories,
        service_types: serviceTypes,
        service_history: jobs?.map(job => ({
          id: job.id,
          job_number: job.job_number,
          date: job.created_at,
          problem: job.problem,
          diagnosis: job.diagnosis,
          status: job.status,
          invoice: job.invoices ? {
            total: job.invoices.total_cost,
            status: job.invoices.status,
            paid_at: job.invoices.paid_at
          } : null,
          appointment: job.appointments ? {
            service_type: job.appointments.service_type,
            date: job.appointments.date
          } : null
        })) || []
      }
    });

  } catch (error) {
    console.error('Health passport error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET ALL VEHICLES SUMMARY
router.get('/summary/all', async (req, res) => {
  try {
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        customers (id, full_name, mobile)
      `);

    if (vehicleError) throw vehicleError;

    const summaries = [];

    for (const vehicle of vehicles) {
      // Get service history
      const { data: jobs } = await supabase
        .from('service_jobs')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('created_at', { ascending: false });

      const totalVisits = jobs?.length || 0;
      const lastService = jobs && jobs.length > 0 ? jobs[0] : null;

      // Get invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_cost')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'paid');

      const totalSpent = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_cost || 0), 0) || 0;

      summaries.push({
        vehicle_id: vehicle.id,
        registration: vehicle.registration,
        model: vehicle.model,
        customer_name: vehicle.customers?.full_name || 'Unknown',
        customer_mobile: vehicle.customers?.mobile || 'Unknown',
        total_visits: totalVisits,
        total_spent: totalSpent,
        last_service_date: lastService?.created_at || null,
        last_service_status: lastService?.status || 'No service',
        current_km: vehicle.current_km || 0
      });
    }

    res.json({
      success: true,
      vehicles: summaries,
      count: summaries.length
    });

  } catch (error) {
    console.error('Error fetching vehicle summaries:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;