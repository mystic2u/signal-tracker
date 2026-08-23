import { useMemo, useState } from 'react';
import Card from './Card';
import SearchBar from './SearchBar';
import { exportArticlesToCsv } from '../utils/export';

const PAGE_SIZE = 20;

function matchesSearch(article, term) {
  if (!term) return true;
  const haystack = `${article.title} ${article.description || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

export default function CategoryDetail({
  category,
  articles,
  onBack,
  isSaved,
  onSave,
  onUnsave,
  onDismiss,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const matches = useMemo(
    () =>
      articles
        .filter((a) => (a.category || []).includes(category.id) && matchesSearch(a, searchTerm))
        .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished)),
    [articles, category.id, searchTerm]
  );

  const visible = matches.slice(0, visibleCount);

  return (
    <div className="view">
      <button type="button" className="back-link" onClick={onBack}>
        &larr; All categories
      </button>

      <div className="category-detail-heading">
        <span className={`freq-tag freq-tag--${category.id}`}>{category.label}</span>
      </div>

      <div className="toolbar">
        <SearchBar onSearch={setSearchTerm} resultCount={matches.length} showCount placeholder={`Search ${category.label}`} />
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => exportArticlesToCsv(matches, `signal-tracker-${category.id}.csv`)}
        >
          Export CSV
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="empty-state">
          <p>No results here. Try clearing your search.</p>
        </div>
      ) : (
        <>
          <div className="card-list">
            {visible.map((article) => (
              <Card
                key={article.id}
                article={article}
                isSaved={isSaved(article.id)}
                onSave={onSave}
                onUnsave={onUnsave}
                onDismiss={onDismiss}
              />
            ))}
          </div>
          {visibleCount < matches.length && (
            <button type="button" className="load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Load more ({matches.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
