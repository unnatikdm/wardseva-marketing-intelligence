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
import { MapPin, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function GeoView({ token, refreshTrigger }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/geo', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load geographic stats');
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
        <p className="text-sm text-dark-muted font-medium">Mapping regional conversion stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading geo metrics</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Filter Virar and Thane for comparison card
  const virar = data.find(c => c.city === 'Virar') || { leads: 0, customers: 0, conversion_rate: 0 };
  const thane = data.find(c => c.city === 'Thane') || { leads: 0, customers: 0, conversion_rate: 0 };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-white tracking-wide">Geographic Intelligence</h3>
        <p className="text-xs text-dark-muted">Attributed revenue, leads, and customer conversion rates organized by service location</p>
      </div>

      {/* Main Geographic Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Leads vs Conversions by City */}
        <div className="p-6 rounded-2xl glass-panel">
          <h4 className="text-md font-bold text-white mb-6">Leads vs Conversions by Location</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
                <XAxis dataKey="city" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }} />
                <Legend iconType="circle" />
                <Bar dataKey="leads" fill="#0ea5e9" name="Inquiries / Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="customers" fill="#10b981" name="Paying Customers" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by City */}
        <div className="p-6 rounded-2xl glass-panel">
          <h4 className="text-md font-bold text-white mb-6">Attributed Revenue by Location</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
                <XAxis dataKey="city" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip 
                  formatter={(val) => `₹${Math.round(val).toLocaleString()}`}
                  contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Virar vs Thane Comparison callout & location detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Callout box comparing Virar vs Thane */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-brand-primary/20 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Location Comparison: Virar vs Thane</h4>
              <p className="text-xs text-dark-muted">Contrasting lead volume against conversions and marketing efficiency</p>
            </div>
          </div>

          <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Thane Block */}
            <div className="p-4 rounded-xl bg-dark-bg/45 border border-dark-border text-center">
              <span className="text-xs font-bold text-brand-danger bg-brand-danger/10 px-2 py-0.5 border border-brand-danger/20 rounded-full">High Volume, Low conversion</span>
              <h5 className="text-md font-bold text-white mt-3">Thane Area</h5>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
                <div>
                  <p className="text-[10px] text-dark-muted">Total Leads</p>
                  <p className="text-sm font-bold text-white">{thane.leads}</p>
                </div>
                <div>
                  <p className="text-[10px] text-dark-muted">Conv. Rate</p>
                  <p className="text-sm font-bold text-brand-danger">{thane.conversion_rate.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Virar Block */}
            <div className="p-4 rounded-xl bg-dark-bg/45 border border-brand-success/20 text-center relative overflow-hidden">
              <span className="text-xs font-bold text-brand-success bg-brand-success/10 px-2 py-0.5 border border-brand-success/20 rounded-full">Highly Profitable Segment</span>
              <h5 className="text-md font-bold text-white mt-3">Virar Area</h5>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
                <div>
                  <p className="text-[10px] text-dark-muted">Total Leads</p>
                  <p className="text-sm font-bold text-white">{virar.leads}</p>
                </div>
                <div>
                  <p className="text-[10px] text-dark-muted">Conv. Rate</p>
                  <p className="text-sm font-bold text-brand-success">{virar.conversion_rate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-dark-border/40 text-xs font-medium text-dark-muted leading-relaxed">
            📢 <strong>Recommendation:</strong> While Thane drives the highest inquiry volume ({thane.leads} leads), it conversion rate is only {thane.conversion_rate.toFixed(0)}%. Virar drives fewer inquiries ({virar.leads} leads) but converts at an exceptional {virar.conversion_rate.toFixed(0)}%. Increase regional bidding multiplier in Virar by <strong>+35%</strong>.
          </div>
        </div>

        {/* Cities Table */}
        <div className="p-6 rounded-2xl glass-panel">
          <h4 className="text-md font-bold text-white mb-4">Location Summary Table</h4>
          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
            {data.map((c, idx) => (
              <div key={c.city} className="flex justify-between items-center p-3 rounded-xl bg-dark-bg/30 border border-dark-border/40">
                <div>
                  <p className="text-xs font-bold text-white tracking-wide">{c.city}</p>
                  <p className="text-[9px] text-dark-muted font-medium">{c.leads} leads / {c.customers} customers</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-brand-success">₹{Math.round(c.revenue).toLocaleString()}</p>
                  <p className="text-[9px] text-dark-muted font-medium">{c.conversion_rate.toFixed(0)}% CR</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
