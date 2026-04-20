import { useState, useEffect, useCallback } from 'react';
import { getArticlesByProject, deleteArticle } from '../../core/storage/articles';
import type { Project, Article } from '../../shared/types';

interface Props {
  project: Project | null;
  selectedArticle: Article | null;
  onSelectArticle: (article: Article) => void;
  onOpenReader: (article: Article) => void;
}

export function ArticleList({ project, selectedArticle, onSelectArticle, onOpenReader }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!project) {
      setArticles([]);
      return;
    }
    setLoading(true);
    try {
      const arts = await getArticlesByProject(project.id);
      setArticles(arts);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for new articles saved via the popup
  useEffect(() => {
    const handler = (message: { type: string }) => {
      if (message.type === 'ARTICLE_SAVED') load();
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [load]);

  async function handleDelete(article: Article, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${article.title}"?`)) return;
    await deleteArticle(article.id);
    await load();
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (!project) {
    return (
      <div className="panel panel-articles">
        <div className="panel-header">
          <span className="panel-title">Articles</span>
        </div>
        <div className="panel-body">
          <p className="empty-state">Select a project to see its articles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel panel-articles">
      <div className="panel-header">
        <span className="panel-title">Articles</span>
        <span className="panel-count">{articles.length}</span>
      </div>

      <div className="panel-body">
        {loading && <p className="empty-state">Loading…</p>}

        {!loading && articles.length === 0 && (
          <p className="empty-state">
            No articles in this project.<br />
            Click the extension icon on any webpage to save an article.
          </p>
        )}

        {articles.map((article) => (
          <div
            key={article.id}
            className={`article-item ${selectedArticle?.id === article.id ? 'active' : ''}`}
            onClick={() => onSelectArticle(article)}
          >
            <div className="article-meta">
              <span className="article-date">{formatDate(article.savedAt)}</span>
              <div className="article-actions">
                <button
                  className="icon-btn-sm"
                  title="Open reader"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReader(article);
                  }}
                >
                  ⤢
                </button>
                <button
                  className="icon-btn-sm danger"
                  title="Delete article"
                  onClick={(e) => handleDelete(article, e)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="article-title">{article.title}</div>
            {article.author && (
              <div className="article-author">{article.author}</div>
            )}
            <div className="article-url" title={article.url}>
              {new URL(article.url).hostname}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
