import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Rewards.css';

const API = axios.create({
  baseURL: '/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function Rewards({ user, onBack }) {
  const [rewards, setRewards] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    fetchRewards();
    fetchCatalog();
    fetchRedemptions();
  }, []);

  const fetchRewards = async () => {
    try {
      const res = await API.get(`/rewards/customer/${user.id}`);
      setRewards(res.data.rewards);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await API.get('/rewards/catalog');
      setCatalog(res.data.rewards || []);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    }
  };

  const fetchRedemptions = async () => {
    try {
      const res = await API.get(`/rewards/redemptions/${user.id}`);
      setRedemptions(res.data.redemptions || []);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    }
    setLoading(false);
  };

  const handleRedeem = async (rewardId, pointsRequired, rewardName) => {
    if (!window.confirm(`Redeem "${rewardName}" for ${pointsRequired} points?`)) return;
    
    setRedeeming(true);
    try {
      const res = await API.post('/rewards/redeem', {
        customer_id: user.id,
        reward_id: rewardId,
        points_to_redeem: pointsRequired
      });
      
      alert(`🎉 ${res.data.message}`);
      fetchRewards();
      fetchRedemptions();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to redeem reward');
    }
    setRedeeming(false);
  };

  if (loading) {
    return <div className="loading">Loading rewards...</div>;
  }

  return (
    <div className="rewards-page">
      <div className="rewards-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>🎁 Rewards</h2>
      </div>

      {/* Points Balance */}
      <div className="points-card">
        <div className="points-balance">
          <div>
            <p className="points-label">Your Points</p>
            <p className="points-number">{rewards?.points || 0}</p>
          </div>
          <div className="points-stats">
            <span>Earned: {rewards?.total_points_earned || 0}</span>
            <span>Spent: {rewards?.points_spent || 0}</span>
          </div>
        </div>
        <div className="points-info">
          💡 Earn 10 points for every ₹100 spent on services
        </div>
      </div>

      {/* Available Rewards */}
      <div className="catalog-section">
        <h3>🎯 Available Rewards</h3>
        {catalog.length === 0 ? (
          <p className="empty-state">No rewards available</p>
        ) : (
          <div className="rewards-grid">
            {catalog.map(reward => {
              const canRedeem = (rewards?.points || 0) >= reward.points_required;
              return (
                <div key={reward.id} className="reward-card">
                  <div className="reward-icon">🎁</div>
                  <h4>{reward.name}</h4>
                  <p>{reward.description}</p>
                  <div className="reward-points">⭐ {reward.points_required} points</div>
                  <button 
                    className={`redeem-btn ${canRedeem ? 'active' : 'disabled'}`}
                    onClick={() => handleRedeem(reward.id, reward.points_required, reward.name)}
                    disabled={!canRedeem || redeeming}
                  >
                    {redeeming ? 'Processing...' : canRedeem ? 'Redeem' : 'Not Enough Points'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redemption History */}
      <div className="history-section">
        <h3>📋 Redemption History</h3>
        {redemptions.length === 0 ? (
          <p className="empty-state">No redemptions yet</p>
        ) : (
          redemptions.map(r => (
            <div key={r.id} className="history-item">
              <div>
                <strong>{r.rewards_catalog?.name || 'Reward'}</strong>
                <p>{r.rewards_catalog?.description || ''}</p>
              </div>
              <div className="history-right">
                <span className="history-points">-{r.points_used} pts</span>
                <span className={`history-status ${r.status}`}>{r.status}</span>
                {r.redemption_code && (
                  <span className="history-code">Code: {r.redemption_code}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Rewards;