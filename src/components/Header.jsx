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
          <svg className="brand-mark" viewBox="0 0 30 30" width="28" height="28" aria-hidden="true">
            <circle cx="15" cy="15" r="14" fill="var(--accent)" />
            <path
              d="M6 16 L11 16 L13 11 L16 20 L18 14 L20 16 L24 16"
              fill="none"
              stroke="var(--surface)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="23" cy="7" r="2.2" fill="var(--cat-energy)" />
            <circle cx="6" cy="23" r="1.6" fill="var(--cat-tech)" />
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
