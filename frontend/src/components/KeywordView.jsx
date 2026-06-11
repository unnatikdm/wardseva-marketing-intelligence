import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

export default function KeywordView({ token, refreshTrigger }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('spend');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/keywords', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load keyword stats');
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedData = [...data]
    .filter(kw => kw.keyword.toLowerCase().includes(search.toLowerCase()) || kw.campaign.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary"></div>
        <p className="text-sm text-dark-muted font-medium">Loading keyword attribution matrices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading keywords</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Search and Title Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">Google Ads Keyword Performance</h3>
          <p className="text-xs text-dark-muted">Attributed revenue, CPC, and CPL metrics tracked per user query</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-dark-muted" />
          <input
            type="text"
            placeholder="Search keywords or campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl glass-input outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-dark-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border bg-dark-panel/40 text-[10px] uppercase font-bold text-dark-muted tracking-wider">
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('keyword')}>
                  <div className="flex items-center gap-1.5">Keyword <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('campaign')}>
                  <div className="flex items-center gap-1.5">Campaign <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('spend')}>
                  <div className="flex items-center justify-end gap-1.5">Spend <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('leads')}>
                  <div className="flex items-center justify-end gap-1.5">Leads <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('customers')}>
                  <div className="flex items-center justify-end gap-1.5">Custs <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('revenue')}>
                  <div className="flex items-center justify-end gap-1.5">Revenue <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('roas')}>
                  <div className="flex items-center justify-end gap-1.5">ROAS <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="p-4 text-center">Status / Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-sm">
              {sortedData.map((kw, idx) => {
                // Determine recommendation action
                let statusLabel = 'Neutral';
                let statusColor = 'bg-gray-500/10 border-gray-500/30 text-dark-muted';
                
                if (kw.roas >= 4.0) {
                  statusLabel = 'Scale Budget';
                  statusColor = 'bg-brand-success/15 border-brand-success/35 text-brand-success';
                } else if (kw.spend > 1000 && (kw.roas < 0.8 || kw.customers === 0)) {
                  statusLabel = 'Pause Keyword';
                  statusColor = 'bg-brand-danger/15 border-brand-danger/35 text-brand-danger';
                } else if (kw.leads > 5 && kw.customers === 0) {
                  statusLabel = 'Fix LP Friction';
                  statusColor = 'bg-brand-warning/15 border-brand-warning/35 text-brand-warning';
                }

                return (
                  <tr key={idx} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="p-4 font-semibold text-white tracking-wide">{kw.keyword}</td>
                    <td className="p-4 text-xs text-dark-muted font-medium">{kw.campaign}</td>
                    <td className="p-4 text-right text-white font-medium">₹{Math.round(kw.spend).toLocaleString()}</td>
                    <td className="p-4 text-right text-white font-medium">{kw.leads}</td>
                    <td className="p-4 text-right text-white font-medium">{kw.customers}</td>
                    <td className="p-4 text-right text-brand-success font-semibold">₹{Math.round(kw.revenue).toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-white">
                      <span className={kw.roas >= 1.5 ? 'text-brand-success' : (kw.roas < 1.0 ? 'text-brand-danger' : 'text-white')}>
                        {kw.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                        {statusLabel === 'Scale Budget' && <CheckCircle className="w-3.5 h-3.5" />}
                        {statusLabel === 'Pause Keyword' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
