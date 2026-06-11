import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Key, 
  TrendingUp,
  RotateCw
} from 'lucide-react';

export default function RecommendationsView({ token, refreshTrigger }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecs = () => {
    setLoading(true);
    fetch('/api/dashboard/recommendations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load AI recommendations');
        return res.json();
      })
      .then(data => {
        setRecs(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecs();
  }, [token, refreshTrigger]);

  const handleApply = (id) => {
    setActionLoading(true);
    fetch(`/api/dashboard/recommendations/${id}/apply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to apply recommendation');
        return res.json();
      })
      .then(() => {
        // Optimistic update
        setRecs(prev => prev.map(r => r.id === Number(id) ? { ...r, status: 'Applied' } : r));
        setActionLoading(false);
      })
      .catch(err => {
        alert(err.message);
        setActionLoading(false);
      });
  };

  const handleDismiss = (id) => {
    setActionLoading(true);
    fetch(`/api/dashboard/recommendations/${id}/dismiss`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to dismiss recommendation');
        return res.json();
      })
      .then(() => {
        setRecs(prev => prev.map(r => r.id === Number(id) ? { ...r, status: 'Dismissed' } : r));
        setActionLoading(false);
      })
      .catch(err => {
        alert(err.message);
        setActionLoading(false);
      });
  };

  const handleRegenerate = () => {
    setGenLoading(true);
    fetch('/api/dashboard/recommendations/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to generate AI recommendations');
        return res.json();
      })
      .then(() => {
        fetchRecs();
        setGenLoading(false);
      })
      .catch(err => {
        alert(err.message);
        setGenLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary"></div>
        <p className="text-sm text-dark-muted font-medium">Running Gemini recommendation algorithms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
        <h3 className="font-bold">Error loading recommendations</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const getRecIcon = (type) => {
    switch(type) {
      case 'budget': return TrendingUp;
      case 'keyword': return Key;
      case 'schedule': return Clock;
      case 'geo': return MapPin;
      default: return Sparkles;
    }
  };

  const getRecColor = (type) => {
    switch(type) {
      case 'budget': return 'text-brand-success bg-brand-success/10 border-brand-success/20';
      case 'keyword': return 'text-brand-primary bg-brand-primary/10 border-brand-primary/20';
      case 'schedule': return 'text-brand-purple bg-brand-purple/10 border-brand-purple/20';
      case 'geo': return 'text-brand-warning bg-brand-warning/10 border-brand-warning/20';
      default: return 'text-white bg-white/10 border-white/20';
    }
  };

  const activeRecs = recs.filter(r => r.status === 'Active');
  const pastRecs = recs.filter(r => r.status !== 'Active');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Trigger button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">AI Recommendation & Audit Engine</h3>
          <p className="text-xs text-dark-muted">Automated campaign audits, budget suggestions, and bid improvements powered by Google Gemini API</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={genLoading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary hover:to-brand-primary text-white text-xs font-bold shadow-lg shadow-brand-primary/30 disabled:opacity-50 transition-all duration-300"
        >
          <RotateCw className={`w-4 h-4 ${genLoading ? 'animate-spin' : ''}`} />
          <span>{genLoading ? 'Regenerating...' : 'Regenerate Recommendations'}</span>
        </button>
      </div>

      {/* Active Recommendations Section */}
      <div className="space-y-6">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-brand-primary animate-pulse" />
          <span>Active Recommendations ({activeRecs.length})</span>
        </h4>

        {activeRecs.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel text-center text-dark-muted text-sm border border-dashed border-dark-border">
            No active recommendations. Click "Regenerate Recommendations" to scan database.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeRecs.map((rec) => {
              const IconComp = getRecIcon(rec.type);
              const colorClasses = getRecColor(rec.type);
              const isHighImpact = rec.impact_score >= 9;

              return (
                <div 
                  key={rec.id} 
                  className={`p-6 rounded-2xl glass-panel border flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 ${
                    isHighImpact ? 'pulse-border' : 'border-dark-border'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Badge header */}
                    <div className="flex justify-between items-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border ${colorClasses}`}>
                        <IconComp className="w-3 h-3" />
                        <span className="capitalize">{rec.type}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        isHighImpact ? 'bg-brand-danger/10 text-brand-danger border border-brand-danger/20' : 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20'
                      }`}>
                        Impact: {rec.impact_score}/10
                      </span>
                    </div>

                    {/* Recommendation Content */}
                    <div>
                      <h5 className="font-bold text-white text-md tracking-wide leading-snug">{rec.title}</h5>
                      <p className="text-xs text-dark-muted mt-2.5 leading-relaxed font-medium">
                        {rec.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="mt-6 pt-4 border-t border-dark-border/40 flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl border border-dark-border hover:bg-white/5 text-xs font-bold text-dark-muted transition-colors duration-150"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleApply(rec.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/85 text-xs font-bold text-white shadow-md shadow-brand-primary/20 transition-all duration-150"
                    >
                      Apply Action
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Log Section */}
      {pastRecs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-dark-border/40">
          <h4 className="text-sm font-bold text-dark-muted uppercase tracking-wider">Recommendation History</h4>
          <div className="space-y-3">
            {pastRecs.map((rec) => {
              const IconComp = getRecIcon(rec.type);
              const colorClasses = getRecColor(rec.type);
              const isApplied = rec.status === 'Applied';

              return (
                <div key={rec.id} className="p-4 rounded-xl bg-dark-panel/20 border border-dark-border/40 flex justify-between items-center opacity-70">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg border ${colorClasses} shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h6 className="text-xs font-bold text-white leading-tight">{rec.title}</h6>
                      <p className="text-[10px] text-dark-muted mt-0.5 font-medium">{rec.recommendation.slice(0, 120)}...</p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border ${
                      isApplied 
                        ? 'bg-brand-success/10 border-brand-success/25 text-brand-success' 
                        : 'bg-gray-500/10 border-gray-500/25 text-dark-muted'
                    }`}>
                      {isApplied ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {rec.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
