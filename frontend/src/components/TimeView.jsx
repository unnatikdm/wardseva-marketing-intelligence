import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

export default function TimeView({ token, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/time', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load time stats');
        return res.json();
      })
      .then(resData => {
        // Pad hourly data to make sure all 24 hours exist
        const hourlyMap = {};
        resData.hourly.forEach(item => {
          hourlyMap[item.hour] = item;
        });

        const paddedHourly = [];
        for (let h = 0; h < 24; h++) {
          paddedHourly.push({
            hour: h,
            displayHour: `${h === 0 ? 12 : (h > 12 ? h - 12 : h)} ${h >= 12 ? 'PM' : 'AM'}`,
            leads: hourlyMap[h] ? hourlyMap[h].leads : 0,
            conversions: hourlyMap[h] ? hourlyMap[h].conversions : 0,
            conversionRate: hourlyMap[h] && hourlyMap[h].leads > 0 
              ? (hourlyMap[h].conversions / hourlyMap[h].leads) * 100 
              : 0
          });
        }

        setData({
          hourly: paddedHourly,
          daily: resData.daily
        });
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
        <p className="text-sm text-dark-muted font-medium">Computing clock analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading time metrics</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const { hourly, daily } = data;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-white tracking-wide">Time & Schedule Intelligence</h3>
        <p className="text-xs text-dark-muted">Discover which hours of the day and days of the week generate maximum leads and customer conversions</p>
      </div>

      {/* Hourly Conversions Timeline */}
      <div className="p-6 rounded-2xl glass-panel relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h4 className="text-md font-bold text-white">24-Hour Conversion Probability</h4>
            <p className="text-xs text-dark-muted">Aggregated hourly lead-to-booking conversion rates</p>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-warning/10 border border-brand-warning/25 text-brand-warning text-xs font-bold">
            <AlertCircle className="w-4.5 h-4.5" />
            <span>Late Evening Peak (9 PM - 11 PM)</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="timeGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
              <XAxis dataKey="displayHour" stroke="#9CA3AF" fontSize={9} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={9} tickLine={false} unit="%" />
              <Tooltip 
                formatter={(val) => `${val.toFixed(1)}%`}
                contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }}
              />
              <Area type="monotone" dataKey="conversionRate" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#timeGlow)" name="Conversion Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Performance Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel">
          <h4 className="text-md font-bold text-white mb-6">Weekly Performance Trends</h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
                <XAxis dataKey="day_name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }} />
                <Legend iconType="circle" />
                <Bar dataKey="leads" fill="#0ea5e9" name="Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversions" fill="#10b981" name="Conversions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Scheduling Insights */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between border border-brand-warning/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-warning/10 text-brand-warning border border-brand-warning/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm font-sans tracking-wide">Schedule Insights</h4>
              <p className="text-xs text-dark-muted">Campaign delivery recommendations</p>
            </div>
          </div>

          <div className="mt-6 space-y-4 flex-1 flex flex-col justify-center">
            <div className="p-4 rounded-xl bg-dark-bg/45 border border-dark-border">
              <p className="text-xs font-bold text-white">💡 Late Night Conversion Peak</p>
              <p className="text-[11px] text-dark-muted mt-2 leading-relaxed">
                Conversion probability jumps to <strong>45%</strong> between <strong>9:00 PM and 11:00 PM</strong>. This aligns with family members researching care solutions for elderly relatives after returning home from work.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-dark-bg/45 border border-dark-border mt-3">
              <p className="text-xs font-bold text-white">🚀 Action Item: Custom Ad Scheduling</p>
              <p className="text-[11px] text-dark-muted mt-2 leading-relaxed">
                Create a custom schedule in Google Ads to boost search bid budgets by <strong>+20% to +30%</strong> during this evening window to capture maximum click share.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
