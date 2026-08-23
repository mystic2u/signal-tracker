import { timeAgo } from '../utils/dateUtils';

export default function CategoryPanel({
  category,
  items,
  totalCount,
  onViewAll,
  editing,
  isHidden,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
}) {
  const openSource = (url) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className={`panel ${isHidden ? 'panel--hidden' : ''}`}>
      <div className="panel-header">
        <div className="panel-title">
          <span className={`freq-tag freq-tag--${category.id}`}>{category.label}</span>
          <span className="panel-count">{totalCount}</span>
        </div>
        {editing ? (
          <div className="panel-edit-controls">
            <button type="button" onClick={onMoveUp} disabled={!canMoveUp} aria-label={`Move ${category.label} up`}>
              &uarr;
            </button>
            <button type="button" onClick={onMoveDown} disabled={!canMoveDown} aria-label={`Move ${category.label} down`}>
              &darr;
            </button>
            <button type="button" onClick={onToggleHidden} aria-label={isHidden ? `Show ${category.label}` : `Hide ${category.label}`}>
              {isHidden ? 'Show' : 'Hide'}
            </button>
          </div>
        ) : (
          <button type="button" className="panel-view-all" onClick={() => onViewAll(category.id)}>
            View all &rarr;
          </button>
        )}
      </div>

      {!isHidden && (
        <div className="panel-list">
          {items.length === 0 ? (
            <p className="panel-empty">Nothing here right now.</p>
          ) : (
            items.map((article) => (
              <div key={article.id} className="panel-item" onClick={() => openSource(article.url)}>
                <div className="panel-item-title">{article.title}</div>
                <div className="panel-item-meta">
                  {article.source} &middot; {timeAgo(article.datePublished)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
