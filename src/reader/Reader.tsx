import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticle } from '../core/storage/articles';
import type { Article } from '../shared/types';
import './reader.css';

function Reader() {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('articleId');

    if (!articleId) {
      setError('No article ID provided.');
      return;
    }

    getArticle(articleId)
      .then((art) => {
        if (!art) {
          setError('Article not found. It may have been deleted.');
        } else {
          setArticle(art);
          document.title = art.title;
        }
      })
      .catch((err) => setError(String(err)));
  }, []);

  function formatDate(ts?: number) {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function estimateReadTime(content: string) {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
  }

  if (error) {
    return (
      <div className="reader-error">
        <span className="reader-logo">◈ Articon</span>
        <h2>Couldn't load article</h2>
        <p>{error}</p>
        <button onClick={() => window.close()}>Close tab</button>
      </div>
    );
  }

  if (!article) {
    return <div className="reader-loading">Loading article…</div>;
  }

  // Fallback for older articles saved before markdown existed.
  const legacyParagraphs = article.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="reader-root">
      <header className="reader-header">
        <button className="back-btn" onClick={() => window.close()}>
          ← Close
        </button>
        <span className="reader-logo">◈ Articon</span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          View original ↗
        </a>
      </header>

      <main className="reader-main">
        <article className="reader-article">
          <h1 className="reader-title">{article.title}</h1>

          <div className="reader-byline">
            {article.author && (
              <span className="reader-author">{article.author}</span>
            )}
            {article.publishedAt && (
              <span className="reader-date">{formatDate(article.publishedAt)}</span>
            )}
            <span className="reader-readtime">{estimateReadTime(article.content)}</span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="reader-source"
            >
              {new URL(article.url).hostname}
            </a>
          </div>

          <div className="reader-divider" />

          <div className="reader-body">
            {article.markdown ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {article.markdown}
              </ReactMarkdown>
            ) : (
              legacyParagraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
            )}
          </div>

          <footer className="reader-footer">
            <div className="reader-footer-meta">
              Saved on {formatDate(article.savedAt)} · {new URL(article.url).hostname}
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<Reader />);
