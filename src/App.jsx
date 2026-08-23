import { useCallback, useMemo, useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CategoryDetail from './components/CategoryDetail';
import SavedItems from './components/SavedItems';
import SettingsPanel from './components/SettingsPanel';
import { useArticles } from './hooks/useArticles';
import { useStorage } from './hooks/useStorage';
import { useNotifications } from './hooks/useNotifications';
import { CATEGORIES } from './utils/constants';
import { isWithinRange } from './utils/dateUtils';
import './App.css';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('signal-tracker-theme') || 'light';
  });
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('signal-tracker-theme', next);
      return next;
    });
  }, []);
  return [theme, toggle];
}

function matchesSearch(article, term) {
  if (!term) return true;
  const haystack = `${article.title} ${article.description || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [focusedCategory, setFocusedCategory] = useState(null);

  const { articles, status, lastUpdated, isStale, newlyArrived, clearNewlyArrived } = useArticles();
  const storage = useStorage();
  const { toasts, dismissToast, history } = useNotifications(
    newlyArrived,
    storage.settings.notificationPreferences,
    clearNewlyArrived
  );

  const allCategories = useMemo(
    () => [
      ...CATEGORIES,
      ...storage.settings.customCategories.map((c) => ({ id: c, label: c })),
    ],
    [storage.settings.customCategories]
  );

  const visibleArticles = useMemo(
    () => articles.filter((a) => !storage.isDismissed(a.id)),
    [articles, storage]
  );

  // Filters for the Saved tab only — the dashboard and category views have
  // their own local search state, since they're not one shared stream.
  const [savedSearchTerm, setSavedSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const toggleCategory = useCallback((id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const savedArticles = useMemo(() => {
    const byId = new Map(articles.map((a) => [a.id, a]));
    let result = storage.savedItems.map((s) => byId.get(s.id)).filter(Boolean);

    result = result.filter((a) => matchesSearch(a, savedSearchTerm));
    if (selectedCategories.length) {
      result = result.filter((a) => (a.category || []).some((c) => selectedCategories.includes(c)));
    }
    if (dateFrom || dateTo) {
      result = result.filter((a) => isWithinRange(a.datePublished, dateFrom, dateTo));
    }
    result = [...result].sort((a, b) => {
      const diff = new Date(b.datePublished) - new Date(a.datePublished);
      return sortOrder === 'newest' ? diff : -diff;
    });
    return result;
  }, [articles, storage.savedItems, savedSearchTerm, selectedCategories, dateFrom, dateTo, sortOrder]);

  const savedMetaById = useMemo(() => {
    const map = {};
    storage.savedItems.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [storage.savedItems]);

  const goHome = useCallback(() => {
    setActiveTab('home');
    setFocusedCategory(null);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setFocusedCategory(null);
  }, []);

  const focusedCategoryMeta = focusedCategory
    ? allCategories.find((c) => c.id === focusedCategory)
    : null;

  return (
    <div className="app" data-theme={theme}>
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onBrandClick={goHome}
        lastUpdated={lastUpdated}
        isStale={isStale}
        theme={theme}
        onToggleTheme={toggleTheme}
        toasts={toasts}
        dismissToast={dismissToast}
        history={history}
      />

      <main className="app-main">
        {status === 'error' && articles.length === 0 && (
          <div className="empty-state">
            <p>
              Couldn't load <code>data/articles.json</code>. If you're running this locally for
              the first time, make sure that file exists — see the README.
            </p>
          </div>
        )}

        {activeTab === 'home' && !focusedCategoryMeta && (
          <Dashboard
            articles={visibleArticles}
            allCategories={allCategories}
            categoryOrder={storage.categoryOrder}
            hiddenCategories={storage.hiddenCategories}
            onSetCategoryOrder={storage.setCategoryOrder}
            onToggleHidden={storage.toggleCategoryHidden}
            onViewAll={setFocusedCategory}
          />
        )}

        {activeTab === 'home' && focusedCategoryMeta && (
          <CategoryDetail
            category={focusedCategoryMeta}
            articles={visibleArticles}
            onBack={() => setFocusedCategory(null)}
            isSaved={storage.isSaved}
            onSave={storage.saveItem}
            onUnsave={storage.unsaveItem}
            onDismiss={storage.dismissItem}
          />
        )}

        {activeTab === 'saved' && (
          <SavedItems
            articles={savedArticles}
            savedMetaById={savedMetaById}
            categories={allCategories}
            filters={{ selectedCategories, dateFrom, dateTo, sortOrder }}
            onSearch={setSavedSearchTerm}
            onToggleCategory={toggleCategory}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSortOrderChange={setSortOrder}
            onUnsave={storage.unsaveItem}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            categories={CATEGORIES}
            notificationPreferences={storage.settings.notificationPreferences}
            onUpdateNotificationPref={storage.updateNotificationPref}
            customCategories={storage.settings.customCategories}
            onAddCustomCategory={storage.addCustomCategory}
            userSources={storage.userSources}
            onAddUserSource={storage.addUserSource}
            onRemoveUserSource={storage.removeUserSource}
          />
        )}
      </main>
    </div>
  );
}
