
/**
 * pie.js — minimal helpers for PIE assets (safe, no trailing commas)
 * All functions are tiny and defensive so older browsers don't choke.
 */

let PIES_BASE = "";

/** Set a base URL that all relative PIE/texture paths resolve against. */
export function setPiesBase(base) {
  if (typeof base !== "string") base = "";
  // strip trailing slashes
  PIES_BASE = base.replace(/\/+$/, "");
}

/**
 * Resolve a texture/model URL from a PIE-relative path.
 * If `PIES_BASE` is set, returns `${PIES_BASE}/${cleanPath}`;
 * otherwise returns `cleanPath` (relative to the current page).
 */
export function resolveTextureUrl(relPath) {
  if (!relPath) return null;
  // Coerce to string and normalise casing so PIE data with upper-case paths
  // can reference lower-case files on case-sensitive file systems.
  var s = String(relPath).toLowerCase();
  // Normalise backslashes and leading ./
  s = s.replace(/\\/g, "/").replace(/^\.\/+/, "");
  // Avoid accidental double slashes when joining
  if (!PIES_BASE) return s;
  return PIES_BASE + "/" + s.replace(/^\/+/, "");
}

/**
 * Very small, tolerant PIE parser placeholder.
 * Returns an object with lines and raw text. Extend as needed.
 */
export function parsePie(text) {
  if (typeof text !== "string") text = String(text || "");
  var lines = text.split(/\r?\n/);
  return { ok: true, lines: lines, raw: text };
}

/**
 * Load a PIE file as text and return a parsed object.
 * This does not depend on THREE.js, it is fetch-only.
 */
export async function loadPieFromUrl(url) {
  var res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Failed to fetch PIE: " + res.status + " " + url);
  var txt = await res.text();
  return parsePie(txt);
}

/**
 * If THREE is present, attempt to build a basic Mesh from a placeholder
 * BoxGeometry so downstream code has something to attach to. This avoids
 * runtime crashes while a full PIE-to-THREE converter is being added.
 */
export function meshFromPieGeometry(geom, material) {
  // Fallback: create a tiny placeholder mesh
  var THREE_ = (typeof THREE !== "undefined") ? THREE : null;
  if (!THREE_) return null;
  var g = (geom && typeof geom === "object" && geom.isBufferGeometry) ? geom : new THREE_.BoxGeometry(1, 1, 1);
  var m = (material && typeof material === "object") ? material : new THREE_.MeshNormalMaterial();
  return new THREE_.Mesh(g, m);
}

/**
 * Historical alias kept for compatibility. If your code called
 * `loadPieGeometryFromUrl` expecting a geometry, it will now resolve the
 * URL, fetch the file and just return the parsed structure.
 */
export async function loadPieGeometryFromUrl(url) {
  var finalUrl = resolveTextureUrl(url);
  return loadPieFromUrl(finalUrl);
}

// Default export for convenience in some bundlers.
const api = {
  setPiesBase,
  resolveTextureUrl,
  parsePie,
  loadPieFromUrl,
  loadPieGeometryFromUrl,
  meshFromPieGeometry
};
export default api;
