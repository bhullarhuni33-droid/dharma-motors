// backend/routes/services.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET ALL SERVICES
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      services: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET SERVICE BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      success: true,
      service: data
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE SERVICE
router.post('/', async (req, res) => {
  try {
    const { name, description, price_min, price_max, category, estimated_time } = req.body;

    if (!name || !price_min || !price_max) {
      return res.status(400).json({ 
        error: 'Name, price min, and price max are required' 
      });
    }

    const { data, error } = await supabase
      .from('services')
      .insert([
        { 
          name, 
          description: description || null,
          price_min: parseFloat(price_min),
          price_max: parseFloat(price_max),
          category: category || 'General',
          estimated_time: estimated_time || null,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Service created successfully!',
      service: data
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE SERVICE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price_min, price_max, category, estimated_time, is_active } = req.body;

    const { data, error } = await supabase
      .from('services')
      .update({
        name,
        description,
        price_min: parseFloat(price_min),
        price_max: parseFloat(price_max),
        category,
        estimated_time,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      success: true,
      message: 'Service updated successfully!',
      service: data
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE SERVICE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Service deleted successfully!'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;