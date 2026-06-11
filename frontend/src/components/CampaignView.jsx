import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  Cell
} from 'recharts';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CampaignView({ token, refreshTrigger }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/campaigns', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load campaign stats');
        return res.json();
      })
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary"></div>
        <p className="text-sm text-dark-muted font-medium">Aggregating ad campaign performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading campaigns</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Cards */}
      <div>
        <h3 className="text-lg font-bold text-white tracking-wide">Campaign ROI Tracking</h3>
        <p className="text-xs text-dark-muted">Attributed revenue compared directly against campaign click spends</p>
      </div>

      {/* Main Campaign Comparison Chart */}
      <div className="p-6 rounded-2xl glass-panel">
        <h4 className="text-md font-bold text-white mb-6">Spend vs Revenue Generated</h4>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
              <XAxis dataKey="campaign" stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <Tooltip 
                formatter={(val) => `₹${Math.round(val).toLocaleString()}`}
                contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="spend" fill="#0ea5e9" name="Campaign Spend" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#10b981" name="CRM Revenue Attributed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign Details Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((c, idx) => {
          const isProfitable = c.roas >= 1.5;
          const isNeutral = c.roas >= 1.0 && c.roas < 1.5;

          return (
            <div key={idx} className="p-6 rounded-2xl glass-panel border border-dark-border flex flex-col justify-between hover:border-brand-primary/45 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-md font-bold text-white tracking-wide">{c.campaign}</h4>
                  <p className="text-[10px] text-dark-muted font-semibold uppercase mt-0.5 tracking-wider">Campaign Category</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isProfitable 
                    ? 'bg-brand-success/10 border-brand-success/35 text-brand-success' 
                    : (isNeutral ? 'bg-brand-warning/10 border-brand-warning/35 text-brand-warning' : 'bg-brand-danger/10 border-brand-danger/35 text-brand-danger')
                }`}>
                  {c.roas.toFixed(2)}x ROAS
                </span>
              </div>

              {/* Stats Block */}
              <div className="my-6 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-dark-bg/45 border border-dark-border rounded-xl">
                  <p className="text-[9px] text-dark-muted uppercase font-bold tracking-wider">Cost Per Customer</p>
                  <p className="text-md font-bold text-white mt-1">₹{c.cpcust > 0 ? Math.round(c.cpcust).toLocaleString() : 'N/A'}</p>
                </div>
                <div className="p-3 bg-dark-bg/45 border border-dark-border rounded-xl">
                  <p className="text-[9px] text-dark-muted uppercase font-bold tracking-wider">Cost Per Lead</p>
                  <p className="text-md font-bold text-white mt-1">₹{c.cpl > 0 ? Math.round(c.cpl).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              {/* Bottom Spend Details */}
              <div className="flex justify-between items-center text-xs border-t border-dark-border/40 pt-4 mt-2">
                <div>
                  <p className="text-[9px] text-dark-muted font-medium">Spend / Clicks</p>
                  <p className="font-semibold text-white mt-0.5">₹{Math.round(c.spend).toLocaleString()} / {c.clicks}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-dark-muted font-medium">Acquired / Revenue</p>
                  <p className="font-semibold text-brand-success mt-0.5">{c.customers} / ₹{Math.round(c.revenue).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
