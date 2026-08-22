// Central place for anything that might need tweaking later.

export const CATEGORIES = [
  { id: 'tech', label: 'Tech' },
  { id: 'food', label: 'Food' },
  { id: 'energy', label: 'Energy' },
  { id: 'telecoms', label: 'Telecoms' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'sport', label: 'Sport' },
  { id: 'culture', label: 'Culture' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'internet-culture', label: 'Internet culture' },
  { id: 'society', label: 'Society' },
  { id: 'forums', label: 'Forums' },
  { id: 'trends', label: 'Trends' },
];

export const DEFAULT_NOTIFICATION_PREFS = {
  tech: { enabled: true, frequency: 5 },
  food: { enabled: true, frequency: 10 },
  energy: { enabled: true, frequency: 5 },
  telecoms: { enabled: true, frequency: 5 },
  lifestyle: { enabled: true, frequency: 5 },
  fashion: { enabled: true, frequency: 5 },
  sport: { enabled: true, frequency: 5 },
  culture: { enabled: true, frequency: 10 },
  entertainment: { enabled: true, frequency: 10 },
  'internet-culture': { enabled: true, frequency: 5 },
  society: { enabled: true, frequency: 5 },
  forums: { enabled: true, frequency: 5 },
  trends: { enabled: true, frequency: 5 },
};

export const STORAGE_KEY = 'signal-tracker-data';

export const DATA_URL = `${import.meta.env.BASE_URL}data/articles.json`;

// If articles.json is older than this, show a "data is stale" warning.
export const STALE_DATA_HOURS = 2;

// How often the app re-checks data/articles.json for new articles.
export const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// How many stories a dashboard panel shows before you have to hit "View all".
export const PANEL_PREVIEW_COUNT = 7;

export const DEFAULT_STORAGE = {
  settings: {
    notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
    customCategories: [],
  },
  userSources: [],
  savedItems: [],
  // Not in the original spec's schema, but needed so a dismissed card
  // doesn't just reappear the next time the page loads.
  dismissedItems: [],
  // Dashboard layout: order is a list of category ids (missing ones are
  // appended in default order); hidden is category ids to skip entirely.
  categoryOrder: [],
  hiddenCategories: [],
};
