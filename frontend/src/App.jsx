import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ExecutiveView from './components/ExecutiveView';
import BehaviorView from './components/BehaviorView';
import FunnelView from './components/FunnelView';
import KeywordView from './components/KeywordView';
import CampaignView from './components/CampaignView';
import ServiceView from './components/ServiceView';
import TimeView from './components/TimeView';
import GeoView from './components/GeoView';
import RecommendationsView from './components/RecommendationsView';
import { RefreshCw, Calendar, Sparkles } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [activeTab, setActiveTab] = useState('executive');
  
  // Login Form States
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Global Refresh State
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Clear token on mount if expired
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setUsername(localStorage.getItem('username') || 'admin');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setToken(data.token);
      setUsername(data.username);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // If not authenticated, render Login Page
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] relative overflow-hidden px-4">
        {/* Futuristic Background Accents */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl glow-effect"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl glow-effect"></div>
        
        <div className="w-full max-w-md p-8 rounded-2xl glass-panel pulse-border shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center font-bold text-3xl text-white shadow-xl shadow-brand-primary/30">
              WS
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-wide">WardSeva Analytics</h2>
            <p className="text-sm text-dark-muted mt-2">Marketing Intelligence & Revenue Platform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm outline-none transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm outline-none transition-all duration-200"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs text-center font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary hover:to-brand-primary text-white font-semibold text-sm shadow-lg shadow-brand-primary/35 hover:shadow-brand-primary/20 transition-all duration-300 transform active:scale-[0.98]"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-dark-border/40 text-center">
            <p className="text-xs text-dark-muted">
              🔐 Demonstration mode. Click button to sign in with pre-filled credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="min-h-screen bg-[#0B0F19] text-dark-text flex">
      {/* Sidebar Nav */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        username={username}
      />

      {/* Main Content Pane */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-20 glass-panel border-b border-dark-border px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-wide text-white capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-xs font-semibold text-brand-primary">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last 30 Days</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Summary / Trigger Generator Indicator */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-dark-muted font-medium bg-dark-panel/45 border border-dark-border px-4 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-brand-purple" />
              <span>AI Insights Ready</span>
            </div>

            <button
              onClick={triggerRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card hover:bg-white/5 border border-dark-border text-xs font-semibold text-white transition-colors duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-primary" />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </header>

        {/* View Switcher Container */}
        <section className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {activeTab === 'executive' && <ExecutiveView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'behavior' && <BehaviorView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'funnel' && <FunnelView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'keywords' && <KeywordView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'campaigns' && <CampaignView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'services' && <ServiceView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'time' && <TimeView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'geo' && <GeoView token={token} refreshTrigger={refreshTrigger} />}
          {activeTab === 'recommendations' && <RecommendationsView token={token} refreshTrigger={refreshTrigger} />}
        </section>
      </main>
    </div>
  );
}
