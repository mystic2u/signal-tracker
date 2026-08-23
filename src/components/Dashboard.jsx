import { useMemo, useState } from 'react';
import CategoryPanel from './CategoryPanel';
import SearchBar from './SearchBar';
import { PANEL_PREVIEW_COUNT } from '../utils/constants';

function matchesSearch(article, term) {
  if (!term) return true;
  const haystack = `${article.title} ${article.description || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

export default function Dashboard({
  articles,
  allCategories,
  categoryOrder,
  hiddenCategories,
  onSetCategoryOrder,
  onToggleHidden,
  onViewAll,
}) {
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const effectiveOrder = useMemo(() => {
    const knownIds = allCategories.map((c) => c.id);
    const kept = categoryOrder.filter((id) => knownIds.includes(id));
    const missing = knownIds.filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  }, [categoryOrder, allCategories]);

  const orderedCategories = useMemo(
    () => effectiveOrder.map((id) => allCategories.find((c) => c.id === id)).filter(Boolean),
    [effectiveOrder, allCategories]
  );

  const visibleCategories = editing
    ? orderedCategories
    : orderedCategories.filter((c) => !hiddenCategories.includes(c.id));

  const grouped = useMemo(() => {
    const map = {};
    orderedCategories.forEach((cat) => {
      const matches = articles
        .filter((a) => (a.category || []).includes(cat.id) && matchesSearch(a, searchTerm))
        .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));
      map[cat.id] = { total: matches.length, preview: matches.slice(0, PANEL_PREVIEW_COUNT) };
    });
    return map;
  }, [articles, orderedCategories, searchTerm]);

  const moveCategory = (id, direction) => {
    const index = effectiveOrder.indexOf(id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= effectiveOrder.length) return;
    const next = [...effectiveOrder];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onSetCategoryOrder(next);
  };

  return (
    <div className="view">
      <div className="toolbar">
        <SearchBar onSearch={setSearchTerm} placeholder="Search across every category" />
        <button type="button" className="toolbar-btn" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Done' : 'Edit layout'}
        </button>
      </div>

      {editing && (
        <p className="settings-hint" style={{ marginBottom: 12 }}>
          Reorder panels with the arrows, or hide the ones you don't want on the dashboard.
          Hidden categories are still searchable and still notify you from Settings.
        </p>
      )}

      <div className="dashboard-grid">
        {visibleCategories.map((cat) => (
          <CategoryPanel
            key={cat.id}
            category={cat}
            items={grouped[cat.id]?.preview || []}
            totalCount={grouped[cat.id]?.total || 0}
            onViewAll={onViewAll}
            editing={editing}
            isHidden={hiddenCategories.includes(cat.id)}
            canMoveUp={effectiveOrder.indexOf(cat.id) > 0}
            canMoveDown={effectiveOrder.indexOf(cat.id) < effectiveOrder.length - 1}
            onMoveUp={() => moveCategory(cat.id, 'up')}
            onMoveDown={() => moveCategory(cat.id, 'down')}
            onToggleHidden={() => onToggleHidden(cat.id)}
          />
        ))}
      </div>
    </div>
  );
}
