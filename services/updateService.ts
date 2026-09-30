import Constants from 'expo-constants';
import { Linking } from 'react-native';

/**
 * Version manifest shape served by the Render backend at /api/version.
 * Falls back gracefully when the endpoint is unreachable or not yet deployed.
 */
export type VersionManifest = {
  latestVersion: string;
  minimumVersion?: string;
  downloadUrl: string;
  title?: string;
  message?: string;
  mandatory?: boolean;
};

const VERSION_URL = 'https://talos-media-platform.onrender.com/api/version';
/** Re-check at most once every 6 hours to avoid slowing startup. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastChecked = 0;
let cachedManifest: VersionManifest | null = null;
/** Shown at most once per session regardless of how many times checkForUpdate is called. */
let shownThisSession = false;

/** Semantic version comparison — returns true when a > b (ignores prerelease labels). */
export function semverGt(a: string, b: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/[^0-9.]/g, '.')
      .split('.')
      .filter(Boolean)
      .map((part) => Number(part) || 0);
  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i += 1) {
    const left = av[i] ?? 0;
    const right = bv[i] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

/** Returns the installed app version from Expo config. */
export function getInstalledVersion(): string {
  return (Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0') as string;
}

/**
 * Checks the remote version manifest.
 * Returns the manifest when an update is available, null otherwise.
 * Silently returns null on network failure or unexpected response.
 * Never throws.
 */
export async function checkForUpdate(force = false): Promise<VersionManifest | null> {
  if (shownThisSession && !force) return null;

  // Serve cached result within the interval.
  if (!force && Date.now() - lastChecked < CHECK_INTERVAL_MS && cachedManifest !== null) {
    const installed = getInstalledVersion();
    const available = semverGt(cachedManifest.latestVersion, installed) ? cachedManifest : null;
    if (available) shownThisSession = true;
    return available;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(VERSION_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = (await resp.json()) as Partial<VersionManifest>;
    if (typeof data.latestVersion !== 'string' || !data.downloadUrl) return null;
    lastChecked = Date.now();
    cachedManifest = data as VersionManifest;
    const installed = getInstalledVersion();
    const available = semverGt(data.latestVersion, installed) ? cachedManifest : null;
    if (available) shownThisSession = true;
    return available;
  } catch {
    return null;
  }
}

/** Opens the official download URL. Does NOT silently download or install. */
export function openDownload(url: string): void {
  void Linking.openURL(url);
}

/** Reset session flag — useful for testing only. */
export function _resetUpdateSession(): void {
  shownThisSession = false;
  lastChecked = 0;
  cachedManifest = null;
}
