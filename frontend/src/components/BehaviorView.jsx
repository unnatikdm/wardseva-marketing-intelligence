import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Monitor, Smartphone, Tablet, ExternalLink, Clock, Eye } from 'lucide-react';

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6'];

export default function BehaviorView({ token, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/behavior', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load behavior stats');
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
        <p className="text-sm text-dark-muted font-medium">Analyzing visitor activity patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading behavior</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const { deviceDistribution, trafficSources, browserDistribution, timeline, heatmapData } = data;

  // Format Helper for Pie Labels
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Visual Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Device Distribution Donut */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white tracking-wide">Device Preferences</h3>
            <p className="text-xs text-dark-muted">Platform share based on monthly website visitors</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-around py-4">
            <div className="h-48 w-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="device"
                  >
                    {deviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Smartphone className="w-5 h-5 text-brand-primary" />
                <span className="text-[10px] uppercase font-bold text-dark-muted mt-1">Visitors</span>
              </div>
            </div>

            <div className="space-y-3 mt-4 sm:mt-0">
              {deviceDistribution.map((d, index) => {
                const total = deviceDistribution.reduce((acc, curr) => acc + curr.count, 0);
                const pct = ((d.count / total) * 100).toFixed(0);
                return (
                  <div key={d.device} className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-sm font-semibold text-white w-20">{d.device}</span>
                    <span className="text-xs text-dark-muted font-medium">({d.count} sessions - {pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Traffic Sources Horizontal Bars */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white tracking-wide">Traffic Acquisition Sources</h3>
            <p className="text-xs text-dark-muted">Top channels driving platform interactions</p>
          </div>
          
          <div className="h-56 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficSources} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" horizontal={false} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis type="category" dataKey="source" stroke="#9CA3AF" fontSize={10} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Session count">
                  {trafficSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Timeline Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white tracking-wide">Traffic & Engagement Timeline</h3>
            <p className="text-xs text-dark-muted">Session and pageview counts (Last 15 days)</p>
          </div>
          
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tickLine={false} tickFormatter={(val) => val.slice(5)} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px' }} />
                <Bar dataKey="sessions" fill="#0ea5e9" name="Sessions" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pageviews" fill="#8b5cf6" name="Pageviews" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmaps Page Click List */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white tracking-wide">Visitor Engagement Hotspots</h3>
            <p className="text-xs text-dark-muted">Pages with highest time spent & click rates</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1">
            {heatmapData.map((page, idx) => {
              const maxClicks = Math.max(...heatmapData.map(h => h.clicks));
              const intensity = (page.clicks / maxClicks) * 100;
              return (
                <div key={idx} className="p-3 rounded-xl bg-dark-bg/35 border border-dark-border/40 hover:border-brand-primary/40 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-brand-primary" />
                      {page.path}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/25">
                      {page.clicks} clicks
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-dark-muted font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-secondary" />
                      {Math.round(page.avg_time)} sec average
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-brand-success" />
                      Engagement Score: {Math.round(intensity)}/100
                    </span>
                  </div>
                  <div className="h-1 w-full bg-dark-bg border border-dark-border rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-brand-primary/65" style={{ width: `${intensity}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
