import { getDB } from './db';
import { STORES } from '../../shared/constants';
import type { Project } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAll(STORES.PROJECTS);
  return projects.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get(STORES.PROJECTS, id);
}

export async function createProject(name: string): Promise<Project> {
  const db = await getDB();
  const project: Project = {
    id: uuidv4(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  await db.put(STORES.PROJECTS, project);
  return project;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const db = await getDB();
  const project = await db.get(STORES.PROJECTS, id);
  if (!project) throw new Error(`Project ${id} not found`);
  await db.put(STORES.PROJECTS, { ...project, name: name.trim() });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  // Delete the project
  await db.delete(STORES.PROJECTS, id);
  // Cascade: delete all articles in this project
  const articles = await db.getAllFromIndex(STORES.ARTICLES, 'by_project', id);
  const tx = db.transaction([STORES.ARTICLES, STORES.EMBEDDINGS, STORES.CHAT_MESSAGES], 'readwrite');
  await Promise.all([
    ...articles.map((a) => tx.objectStore(STORES.ARTICLES).delete(a.id)),
    ...articles.map((a) => tx.objectStore(STORES.EMBEDDINGS).delete(a.id)),
    // Delete chat messages for this project
    db.getAllFromIndex(STORES.CHAT_MESSAGES, 'by_project', id).then((msgs) =>
      msgs.map((m) => tx.objectStore(STORES.CHAT_MESSAGES).delete(m.id))
    ),
    tx.done,
  ]);
}
