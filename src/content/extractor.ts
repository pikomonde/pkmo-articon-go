import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import type { ExtractedArticle } from '../shared/types';

// Configure once at module level, reused for every extraction
const turndown = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
});

export function extractArticle(): ExtractedArticle | null {
  try {
    // Clone the document so Readability doesn't mutate the live page
    const docClone = document.cloneNode(true) as Document;
    const reader = new Readability(docClone);
    const parsed = reader.parse();

    if (!parsed) return null;

    // Convert the cleaned HTML to Markdown for reader mode + download.
    // Falls back to plain text if Readability didn't return HTML.
    let markdown = '';
    if (parsed.content) {
      try {
        markdown = turndown.turndown(parsed.content);
      } catch {
        markdown = parsed.textContent ?? '';
      }
    } else {
      markdown = parsed.textContent ?? '';
    }

    // Try to extract publish date from meta tags
    let publishedAt: number | undefined;
    const dateMeta =
      document.querySelector<HTMLMetaElement>('meta[property="article:published_time"]') ??
      document.querySelector<HTMLMetaElement>('meta[name="date"]') ??
      document.querySelector<HTMLMetaElement>('meta[itemprop="datePublished"]');

    if (dateMeta?.content) {
      const parsed_date = Date.parse(dateMeta.content);
      if (!isNaN(parsed_date)) publishedAt = parsed_date;
    }

    // Try to extract author from meta tags if Readability didn't find one
    let author = parsed.byline ?? undefined;
    if (!author) {
      const authorMeta =
        document.querySelector<HTMLMetaElement>('meta[name="author"]') ??
        document.querySelector<HTMLMetaElement>('meta[property="article:author"]');
      author = authorMeta?.content ?? undefined;
    }

    return {
      title: parsed.title ?? '',
      content: parsed.textContent ?? '',  // plain text → chunking & embedding
      markdown,                           // markdown → reader mode & download
      url: window.location.href,
      author,
      publishedAt,
    };
  } catch (err) {
    console.error('[Articon] Article extraction failed:', err);
    return null;
  }
}
