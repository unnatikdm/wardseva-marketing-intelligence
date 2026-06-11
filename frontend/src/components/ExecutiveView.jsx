import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  UserCheck, 
  Users, 
  TrendingUp, 
  Percent, 
  CreditCard, 
  BarChart3 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function ExecutiveView({ token, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load summary stats');
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
        <p className="text-sm text-dark-muted font-medium">Fetching executive performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading summary</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const { kpis, dailyChart } = data;

  const cardConfig = [
    {
      title: 'Total Revenue',
      value: `₹${Number(kpis.totalRevenue).toLocaleString()}`,
      subtitle: 'Attributed from CRM sales',
      icon: DollarSign,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-brand-success'
    },
    {
      title: 'Total Marketing Spend',
      value: `₹${Number(kpis.totalSpend).toLocaleString()}`,
      subtitle: 'Google Ads budget consumed',
      icon: CreditCard,
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40 text-brand-primary'
    },
    {
      title: 'Return on Ad Spend (ROAS)',
      value: `${kpis.roas.toFixed(2)}x`,
      subtitle: 'Revenue generated per rupee spent',
      icon: TrendingUp,
      color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-brand-secondary'
    },
    {
      title: 'Total Leads Generated',
      value: kpis.totalLeads,
      subtitle: 'Forms, calls & WhatsApp clicks',
      icon: Users,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-brand-purple'
    },
    {
      title: 'Qualified Leads',
      value: kpis.totalQualified,
      subtitle: 'Valid homecare inquiries',
      icon: UserCheck,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-brand-warning'
    },
    {
      title: 'Conversion Rate',
      value: `${kpis.conversionRate.toFixed(1)}%`,
      subtitle: 'Leads to paying customers',
      icon: Percent,
      color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/40 text-brand-success'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardConfig.map((card, idx) => {
          const IconComp = card.icon;
          return (
            <div 
              key={idx} 
              className={`p-6 rounded-2xl border bg-gradient-to-br ${card.color} glass-card hover:translate-y-[-4px] transition-all duration-300 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-dark-muted uppercase tracking-wider">{card.title}</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">{card.value}</h3>
                  <p className="text-xs text-dark-muted mt-1 font-medium">{card.subtitle}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <IconComp className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leads and Conversions Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-md font-bold text-white tracking-wide">Daily Conversions Trend</h3>
              <p className="text-xs text-dark-muted">Lead capturing vs converted accounts (Last 14 days)</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-brand-primary"><span className="h-2 w-2 rounded-full bg-brand-primary"></span> Leads</span>
              <span className="flex items-center gap-1 text-brand-success"><span className="h-2 w-2 rounded-full bg-brand-success"></span> Conversions</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222F4C" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(val) => val.slice(5)} // Show MM-DD
                />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4C', borderRadius: '12px', fontSize: '12px', color: '#F3F4F6' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" name="Total Leads" />
                <Area type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConversions)" name="Conversions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Quality Distribution (Card) */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white tracking-wide">Marketing Funnel Quality</h3>
            <p className="text-xs text-dark-muted">Lead qualification ratios</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center py-6">
            {/* Visual breakdown bars instead of standard pie for rich, responsive aesthetic */}
            <div className="w-full space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-dark-muted">Qualified Ratio</span>
                  <span className="text-brand-warning">{((kpis.totalQualified / kpis.totalLeads) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-dark-bg border border-dark-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-warning transition-all duration-1000" 
                    style={{ width: `${(kpis.totalQualified / kpis.totalLeads) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-dark-muted">Customer Conversion Ratio</span>
                  <span className="text-brand-success">{kpis.conversionRate.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-dark-bg border border-dark-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-success transition-all duration-1000" 
                    style={{ width: `${kpis.conversionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-border/40 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-dark-bg/45 border border-dark-border rounded-xl">
                  <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Acquisition Cost</p>
                  <p className="text-lg font-bold text-white mt-1">₹{(kpis.totalSpend / kpis.totalCustomers).toFixed(0)}</p>
                  <p className="text-[9px] text-dark-muted">Cost per customer</p>
                </div>
                <div className="p-3 bg-dark-bg/45 border border-dark-border rounded-xl">
                  <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">CPL</p>
                  <p className="text-lg font-bold text-white mt-1">₹{(kpis.totalSpend / kpis.totalLeads).toFixed(0)}</p>
                  <p className="text-[9px] text-dark-muted">Cost per lead</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
