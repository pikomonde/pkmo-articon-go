import { getDB } from './db';
import { STORES, SETTINGS_KEY } from '../../shared/constants';
import type { Settings, LLMProvider } from '../../shared/types';

const DEFAULT_SETTINGS: Settings = {
  onboardingComplete: false,
};

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const stored = await db.get(STORES.SETTINGS, SETTINGS_KEY);
  return (stored as Settings) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put(STORES.SETTINGS, settings, SETTINGS_KEY);
}

export async function getLLMProvider(): Promise<LLMProvider | undefined> {
  const settings = await getSettings();
  return settings.provider;
}

export async function setLLMProvider(provider: LLMProvider): Promise<void> {
  const settings = await getSettings();
  await saveSettings({ ...settings, provider });
}

export async function isOnboardingComplete(): Promise<boolean> {
  const settings = await getSettings();
  return settings.onboardingComplete;
}

export async function completeOnboarding(provider: LLMProvider): Promise<void> {
  await saveSettings({ provider, onboardingComplete: true });
}
