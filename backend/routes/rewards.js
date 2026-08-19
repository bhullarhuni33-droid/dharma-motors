// backend/routes/rewards.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// GET CUSTOMER REWARDS (Points Balance)
// ============================================
router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    let { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    // If no rewards, return default
    if (error && error.code === 'PGRST116') {
      return res.json({
        success: true,
        rewards: {
          customer_id: customer_id,
          points: 0,
          total_points_earned: 0,
          points_spent: 0
        }
      });
    }

    if (error) throw error;

    res.json({
      success: true,
      rewards: data
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GET REWARDS CATALOG (Available Rewards)
// ============================================
router.get('/catalog', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('is_active', true)
      .order('points_required', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      rewards: data || []
    });
  } catch (error) {
    console.error('Error fetching rewards catalog:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GET ALL REWARDS (Admin)
// ============================================
router.get('/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      rewards: data || []
    });
  } catch (error) {
    console.error('Error fetching all rewards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// CREATE REWARD (Admin only)
// ============================================
router.post('/catalog', async (req, res) => {
  try {
    const { name, description, points_required, image_url } = req.body;

    if (!name || !points_required) {
      return res.status(400).json({ error: 'Name and points required are required' });
    }

    const { data, error } = await supabase
      .from('rewards_catalog')
      .insert([
        { 
          name, 
          description: description || null,
          points_required: parseInt(points_required),
          image_url: image_url || null,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Reward created successfully!',
      reward: data
    });
  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ADD POINTS (Staff only - when invoice paid)
// ============================================
router.post('/add-points', async (req, res) => {
  try {
    const { customer_id, points, reason } = req.body;

    if (!customer_id || !points) {
      return res.status(400).json({ error: 'Customer ID and points are required' });
    }

    if (points <= 0) {
      return res.status(400).json({ error: 'Points must be greater than 0' });
    }

    // Check if rewards exist
    let { data: rewards, error: fetchError } = await supabase
      .from('rewards')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    // If no rewards, initialize
    if (!rewards) {
      const { data: newRewards, error: initError } = await supabase
        .from('rewards')
        .insert([
          { 
            customer_id,
            points: 0,
            total_points_earned: 0,
            points_spent: 0
          }
        ])
        .select()
        .single();

      if (initError) throw initError;
      rewards = newRewards;
    }

    // Update points
    const newPoints = rewards.points + points;
    const newTotal = rewards.total_points_earned + points;

    const { data: updated, error: updateError } = await supabase
      .from('rewards')
      .update({ 
        points: newPoints,
        total_points_earned: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customer_id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`✅ Added ${points} points to customer ${customer_id}. Reason: ${reason || 'Service'}`);

    res.json({
      success: true,
      message: `${points} points added successfully!`,
      rewards: updated
    });
  } catch (error) {
    console.error('Add points error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ============================================
// REDEEM REWARD (Customer)
// ============================================
router.post('/redeem', async (req, res) => {
  try {
    const { customer_id, reward_id, points_to_redeem } = req.body;

    if (!customer_id || !reward_id || !points_to_redeem) {
      return res.status(400).json({ error: 'Customer ID, reward ID, and points are required' });
    }

    // Get customer's current points
    const { data: rewards, error: fetchError } = await supabase
      .from('rewards')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    if (!rewards) {
      return res.status(404).json({ error: 'No rewards found for this customer' });
    }

    // Check if enough points
    if (rewards.points < points_to_redeem) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        available_points: rewards.points,
        requested_points: points_to_redeem
      });
    }

    // Get reward details
    const { data: reward, error: rewardError } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('id', reward_id)
      .single();

    if (rewardError) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    // Deduct points
    const newPoints = rewards.points - points_to_redeem;
    const newSpent = (rewards.points_spent || 0) + points_to_redeem;

    const { data: updated, error: updateError } = await supabase
      .from('rewards')
      .update({ 
        points: newPoints,
        points_spent: newSpent,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customer_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create redemption record
    const redemptionCode = `RWD-${Date.now().toString().slice(-6)}`;
    const { error: redemptionError } = await supabase
      .from('reward_redemptions')
      .insert([
        {
          customer_id,
          reward_id,
          points_used: points_to_redeem,
          status: 'pending',
          redemption_code: redemptionCode
        }
      ]);

    if (redemptionError) {
      console.error('Redemption record error:', redemptionError);
    }

    res.json({
      success: true,
      message: `🎉 ${reward.name} redeemed successfully!`,
      reward: reward,
      remaining_points: newPoints,
      redemption_code: redemptionCode
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ============================================
// GET CUSTOMER REDEMPTION HISTORY
// ============================================
router.get('/redemptions/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    const { data, error } = await supabase
      .from('reward_redemptions')
      .select(`
        *,
        rewards_catalog (name, description, points_required)
      `)
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.json({
        success: true,
        redemptions: []
      });
    }

    res.json({
      success: true,
      redemptions: data || []
    });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GET TOP CUSTOMERS (Admin dashboard)
// ============================================
router.get('/top-customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select(`
        points,
        total_points_earned,
        customers (id, full_name, mobile)
      `)
      .order('points', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      top_customers: data || []
    });
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;