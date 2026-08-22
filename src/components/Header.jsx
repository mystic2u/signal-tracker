import { timeAgo } from '../utils/dateUtils';
import NotificationCenter from './NotificationCenter';

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'saved', label: 'Saved' },
  { id: 'settings', label: 'Settings' },
];

export default function Header({
  activeTab,
  onTabChange,
  onBrandClick,
  lastUpdated,
  isStale,
  theme,
  onToggleTheme,
  toasts,
  dismissToast,
  history,
}) {
  return (
    <header className="app-header">
      <div className="app-header-top">
        <button type="button" className="brand" onClick={onBrandClick} aria-label="Go to home dashboard">
          <svg className="brand-mark" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <circle cx="16" cy="16" r="2.4" fill="currentColor" />
            <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
            <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
          </svg>
          <span className="brand-name">Signal Tracker</span>
        </button>

        <div className="header-right">
          <span className={`status-pill ${isStale ? 'status-pill--stale' : ''}`}>
            <span className="pulse-dot" aria-hidden="true" />
            {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'Loading feed'}
            {isStale && ' · data may be stale'}
          </span>

          <NotificationCenter toasts={toasts} dismissToast={dismissToast} history={history} />

          <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>

      <nav className="app-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`app-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
