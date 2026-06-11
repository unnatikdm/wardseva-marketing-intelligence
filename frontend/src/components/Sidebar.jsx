import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Filter, 
  Key, 
  Megaphone, 
  HeartPulse, 
  Clock, 
  MapPin, 
  Sparkles,
  LogOut
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout, username }) {
  const menuItems = [
    { id: 'executive', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'behavior', label: 'Customer Behavior', icon: Users },
    { id: 'funnel', label: 'Conversion Funnel', icon: Filter },
    { id: 'keywords', label: 'Keyword Intelligence', icon: Key },
    { id: 'campaigns', label: 'Campaign Intelligence', icon: Megaphone },
    { id: 'services', label: 'Service Intelligence', icon: HeartPulse },
    { id: 'time', label: 'Time Intelligence', icon: Clock },
    { id: 'geo', label: 'Geographic Intelligence', icon: MapPin },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles, badge: true }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-dark-border h-screen flex flex-col justify-between fixed left-0 top-0 z-20">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-6 border-b border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brand-primary/20">
            WS
          </div>
          <div>
            <h1 className="font-bold text-md leading-tight text-white tracking-wide">WardSeva</h1>
            <p className="text-xs text-brand-primary font-medium tracking-wider uppercase">Marketing Intelligence</p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'active-nav-item text-white' 
                    : 'text-dark-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-brand-primary' : 'text-dark-muted group-hover:text-white'
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session Info & Logout */}
      <div className="p-4 border-t border-dark-border bg-dark-bg/25">
        <div className="flex items-center justify-between p-2 rounded-lg">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-brand-secondary/30 flex items-center justify-center font-medium text-brand-secondary text-sm border border-brand-secondary/20">
              {username ? username[0].toUpperCase() : 'A'}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{username || 'Admin'}</p>
              <p className="text-xs text-dark-muted truncate">Administrator</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Log Out"
            className="p-2 text-dark-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
