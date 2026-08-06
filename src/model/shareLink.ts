// Phase 4: shareable layout links. There's no backend, so "sharing" means
// exactly what it sounds like — the whole layout, in its compact
// topology-only form, lives in the URL's hash fragment. Anyone who opens
// the link gets the same graph rebuilt via the same replay path as file
// load. Hash fragments never reach a server, so this stays fully static.
import type { SerializedLayout } from "./graph";

const HASH_PREFIX = "#layout=";

export function buildShareUrl(layout: SerializedLayout): string {
  const json = JSON.stringify(layout);
  const encoded = encodeURIComponent(btoa(json));
  const url = new URL(window.location.href);
  url.hash = "";
  return `${url.toString()}${HASH_PREFIX}${encoded}`;
}

export function readLayoutFromLocationHash(): SerializedLayout | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const encoded = hash.slice(HASH_PREFIX.length);
    const json = atob(decodeURIComponent(encoded));
    const data = JSON.parse(json) as SerializedLayout;
    if (!Array.isArray(data.actions)) return null;
    return data;
  } catch {
    return null;
  }
}
