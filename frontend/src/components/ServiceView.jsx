import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { HeartPulse, Stethoscope, BedDouble, UserCog, ClipboardCheck } from 'lucide-react';

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ServiceView({ token, refreshTrigger }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/services', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load service stats');
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
        <p className="text-sm text-dark-muted font-medium">Breaking down category performances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading services</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const serviceIcons = {
    'Home Nursing': Stethoscope,
    'ICU Care': BedDouble,
    'Caregiver Services': HeartPulse,
    'Ward Boy Services': UserCog,
    'Medical Equipment Rental': ClipboardCheck
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h3 className="text-lg font-bold text-white tracking-wide">Service Category Analytics</h3>
        <p className="text-xs text-dark-muted">Lead capturing, booking conversion rates, and gross profits generated per service category</p>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Category Conversion Rates */}
        <div className="p-6 rounded-2xl glass-panel">
          <h4 className="text-md font-bold text-white mb-6">Booking Conversion Rates (%)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
                <XAxis dataKey="service" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} unit="%" />
                <Tooltip 
                  formatter={(val) => `${val.toFixed(1)}%`}
                  contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }}
                />
                <Bar dataKey="conversion_rate" fill="#6366f1" name="Conversion Rate" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Share Donut */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <h4 className="text-md font-bold text-white mb-4">Gross Revenue Attributed</h4>
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="revenue"
                    nameKey="service"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => `₹${Math.round(val).toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2.5 mt-4 sm:mt-0">
              {data.map((s, index) => {
                const totalRev = data.reduce((a, b) => a + b.revenue, 0);
                const pct = totalRev > 0 ? ((s.revenue / totalRev) * 100).toFixed(0) : 0;
                return (
                  <div key={s.service} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-xs font-semibold text-white w-28 truncate">{s.service}</span>
                    <span className="text-[10px] text-dark-muted">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Grid of Service Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((s) => {
          const IconComponent = serviceIcons[s.service] || HeartPulse;

          return (
            <div key={s.service} className="p-6 rounded-2xl glass-panel border border-dark-border flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">{s.service}</h5>
                    <p className="text-[10px] text-dark-muted font-semibold uppercase mt-0.5 tracking-wider">Line of Service</p>
                  </div>
                </div>
              </div>

              {/* Data numbers */}
              <div className="my-6 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-dark-bg/40 border border-dark-border rounded-xl">
                  <p className="text-[9px] text-dark-muted uppercase font-bold tracking-wider">Leads / Booking</p>
                  <p className="text-md font-bold text-white mt-1">{s.leads} / {s.customers}</p>
                </div>
                <div className="p-3 bg-dark-bg/40 border border-dark-border rounded-xl">
                  <p className="text-[9px] text-dark-muted uppercase font-bold tracking-wider">Conversion Rate</p>
                  <p className="text-md font-bold text-white mt-1">{s.conversion_rate.toFixed(0)}%</p>
                </div>
              </div>

              {/* Revenue & Profits */}
              <div className="flex justify-between items-center text-xs border-t border-dark-border/40 pt-4 mt-2">
                <div>
                  <p className="text-[9px] text-dark-muted font-medium">Attributed Revenue</p>
                  <p className="font-bold text-white mt-0.5">₹{Math.round(s.revenue).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-dark-muted font-medium">Estimated Gross Profit</p>
                  <p className="font-bold text-brand-success mt-0.5">₹{Math.round(s.profit).toLocaleString()}</p>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
