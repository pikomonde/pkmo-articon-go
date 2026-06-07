import JSZip from 'jszip';
import { getProject } from '../storage/projects';
import { getArticlesByProject } from '../storage/articles';
import type { Article } from '../../shared/types';

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled'
  );
}

// Wrap in double quotes + escape, so titles/authors with ':' or '"' stay valid YAML
function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(a: Article): string {
  const lines: string[] = ['---'];
  lines.push(`title: ${yamlString(a.title || 'Untitled')}`);
  lines.push(`url: ${yamlString(a.url)}`);
  if (a.author) lines.push(`author: ${yamlString(a.author)}`);
  if (a.publishedAt) {
    lines.push(`published: ${yamlString(new Date(a.publishedAt).toISOString())}`);
  }
  lines.push(`saved: ${yamlString(new Date(a.savedAt).toISOString())}`);
  try {
    lines.push(`source: ${yamlString(new URL(a.url).hostname)}`);
  } catch {
    // ignore malformed URL
  }
  lines.push('---');
  return lines.join('\n');
}

function buildMarkdownFile(a: Article): string {
  const frontmatter = buildFrontmatter(a);
  const body = a.markdown || a.content || ''; // fallback for legacy articles
  return `${frontmatter}\n\n# ${a.title || 'Untitled'}\n\n${body}\n`;
}

export async function downloadProjectAsZip(projectId: string): Promise<number> {
  const [project, articles] = await Promise.all([
    getProject(projectId),
    getArticlesByProject(projectId),
  ]);

  const projectName = project?.name ?? 'project';
  const zip = new JSZip();
  const folder = zip.folder(slugify(projectName)) ?? zip;

  // Dedupe filenames so two articles with the same title don't overwrite
  const usedNames = new Set<string>();
  for (const a of articles) {
    const base = slugify(a.title || 'untitled');
    let name = `${base}.md`;
    let n = 2;
    while (usedNames.has(name)) {
      name = `${base}-${n}.md`;
      n += 1;
    }
    usedNames.add(name);
    folder.file(name, buildMarkdownFile(a));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(projectName)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return articles.length;
}
