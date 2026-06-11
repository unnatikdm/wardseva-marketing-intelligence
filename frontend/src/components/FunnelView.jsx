import React, { useState, useEffect } from 'react';
import { Filter, ChevronDown, UserX, UserCheck, Flame, Compass } from 'lucide-react';

export default function FunnelView({ token, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/funnel', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load funnel stats');
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
        <p className="text-sm text-dark-muted font-medium">Computing conversion funnel analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading funnel</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Calculate drop-off counts and percentages between stages
  const formattedFunnel = data.map((stage, idx) => {
    if (idx === 0) {
      return { ...stage, dropOffCount: 0, dropOffPct: 0 };
    }
    const prevStage = data[idx - 1];
    const dropOffCount = prevStage.value - stage.value;
    const dropOffPct = prevStage.value > 0 ? (dropOffCount / prevStage.value) * 100 : 0;
    return {
      ...stage,
      dropOffCount,
      dropOffPct
    };
  });

  const visitorToLead = data[0].value > 0 ? (data[1].value / data[0].value) * 100 : 0;
  const leadToCustomer = data[1].value > 0 ? (data[3].value / data[1].value) * 100 : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Funnel Layout */}
      <div className="p-8 rounded-2xl glass-panel relative overflow-hidden">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Acquisition & Sales Funnel</h3>
            <p className="text-xs text-dark-muted">End-to-end progression tracking from landing page sessions to bookings</p>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-dark-bg/50 border border-dark-border rounded-xl text-center">
              <p className="text-[10px] text-dark-muted font-semibold uppercase tracking-wider">Visitor-to-Lead</p>
              <p className="text-md font-bold text-brand-primary mt-0.5">{visitorToLead.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-dark-bg/50 border border-dark-border rounded-xl text-center">
              <p className="text-[10px] text-dark-muted font-semibold uppercase tracking-wider">Lead-to-Customer</p>
              <p className="text-md font-bold text-brand-success mt-0.5">{leadToCustomer.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Funnel Stacks */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {formattedFunnel.map((stage, idx) => {
            const widthPct = 100 - idx * 12; // Gradual decline in width
            const bgGradients = [
              'from-brand-primary/25 to-blue-500/10 border-brand-primary/45',
              'from-brand-purple/25 to-indigo-500/10 border-brand-purple/45',
              'from-brand-warning/25 to-amber-500/10 border-brand-warning/45',
              'from-brand-success/25 to-emerald-500/10 border-brand-success/45'
            ];

            return (
              <div key={stage.name} className="flex flex-col items-center">
                {/* Stage Banner */}
                <div 
                  className={`w-full p-4 rounded-xl border bg-gradient-to-r ${bgGradients[idx]} flex items-center justify-between transition-all duration-300 hover:scale-[1.01]`}
                  style={{ maxWidth: `${widthPct}%` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-wide">{stage.name}</p>
                      <p className="text-[10px] text-dark-muted font-medium">Stage conversion: {idx === 0 ? '100' : stage.rate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-white">{stage.value.toLocaleString()}</p>
                    <p className="text-[9px] text-dark-muted uppercase font-bold tracking-wider">Total Volume</p>
                  </div>
                </div>

                {/* Drop-off / Connection Arrow */}
                {idx < formattedFunnel.length - 1 && (
                  <div className="flex items-center justify-center py-2 text-brand-danger gap-1.5 animate-pulse">
                    <ChevronDown className="w-5 h-5 text-brand-danger" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase bg-brand-danger/10 border border-brand-danger/25 px-2.5 py-0.5 rounded-full">
                      -{formattedFunnel[idx + 1].dropOffPct.toFixed(0)}% Drop-off (-{formattedFunnel[idx + 1].dropOffCount} inquiries)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Major Drop-offs */}
        <div className="p-6 rounded-2xl glass-panel border border-brand-danger/20 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Top Funnel Leakage</h4>
              <p className="text-xs text-dark-muted">Largest customer drop-off points</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-dark-bg/40 border border-dark-border/60">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-white">Visitor ➔ Lead Drop-off</span>
                <span className="text-brand-danger font-bold">-{formattedFunnel[1].dropOffPct.toFixed(1)}%</span>
              </div>
              <p className="text-[11px] text-dark-muted mt-2 font-medium">
                Out of {formattedFunnel[0].value} unique visitors, only {formattedFunnel[1].value} submitted an inquiry. This indicates potential friction on the landing page layout, long form fields, or lack of direct trust signals.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-dark-bg/40 border border-dark-border/60">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-white">Lead ➔ Qualified Lead Drop-off</span>
                <span className="text-brand-danger font-bold">-{formattedFunnel[2].dropOffPct.toFixed(1)}%</span>
              </div>
              <p className="text-[11px] text-dark-muted mt-2 font-medium">
                Inquiries that fail to get qualified. This is caused by junk contact forms, spam phone numbers, or target mismatch in ad bidding (e.g. bidding on "cheap caregiver" queries).
              </p>
            </div>
          </div>
        </div>

        {/* Optimizations */}
        <div className="p-6 rounded-2xl glass-panel border border-brand-success/20 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-success/10 text-brand-success border border-brand-success/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Actionable Funnel Solutions</h4>
              <p className="text-xs text-dark-muted">Data-driven tactics to restore leaky conversion rates</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded bg-brand-primary/20 flex items-center justify-center font-bold text-xs text-brand-primary shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Introduce One-Click WhatsApp CTA</h5>
                <p className="text-[11px] text-dark-muted mt-1 font-medium">
                  Adding a WhatsApp click button directly on mobile view screens can lift Visitor-to-Lead conversion rate by 15-20% by eliminating form filling friction.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-5 w-5 rounded bg-brand-secondary/20 flex items-center justify-center font-bold text-xs text-brand-secondary shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Negative Keywords Scrubbing</h5>
                <p className="text-[11px] text-dark-muted mt-1 font-medium">
                  Add "free", "government job", and "cheap" as negative keywords in Google Ads to block non-revenue yielding traffic, lifting the Lead-to-Qualified ratio.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-5 w-5 rounded bg-brand-success/20 flex items-center justify-center font-bold text-xs text-brand-success shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Fast-Track High Value Services</h5>
                <p className="text-[11px] text-dark-muted mt-1 font-medium">
                  Establish a priority SLA response team for premium requests (like "ICU Care" setups) to capture conversion intent within 10 minutes, preventing competitor bookings.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
