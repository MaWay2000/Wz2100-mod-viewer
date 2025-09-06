
// piePreview.js - lightweight bridge between the page and PIE renderer
// Provides a stable API used by piePreview-init.js:
//   - export function showPie(target, piePath, options)
//   - export function renderPieIntoCanvas(canvas, piePath, options)
//   - export function configurePieBase(baseUrl)
//
// It tries to use a global lightweight viewer `window.PieMiniViewer` if present.
// If not, it draws a tiny placeholder so the UI doesn't look broken.

import { setPiesBase } from './pie.js';

/**
 * Configure the base URL from which PIE-relative resources are resolved.
 * Delegates to pie.js (setPiesBase).
 */
export function configurePieBase(baseUrl) {
  try { setPiesBase(baseUrl); } catch (e) { /* noop */ }
}

/**
 * Render a PIE file into a canvas. If a real viewer is available, use it;
 * otherwise draw a small "PIE" placeholder.
 */
export async function renderPieIntoCanvas(canvas, piePath, options = {}) {
  if (!canvas) return false;
  const url = String(piePath || '').trim();
  const viewer = (typeof window !== 'undefined') && (window.PieMiniViewer || window.PIELoader);
  try {
    if (viewer && typeof viewer.render === 'function') {
      await viewer.render(canvas, url, options);
      return true;
    }
  } catch (err) {
    console.error('PIE mini viewer render error:', err);
  }
  // Fallback placeholder
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#9fc3ff';
  ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  ctx.globalAlpha = 0.85;
  const label = (url ? (url.split('/').pop()) : 'PIE');
  ctx.fillText(label, 6, 14);
  ctx.globalAlpha = 1;
  return false;
}

/**
 * Convenience wrapper: accepts a canvas element OR a selector string.
 * Ensures the canvas is device-pixel-ratio sized and calls renderPieIntoCanvas.
 */
export async function showPie(target, piePath, options = {}) {
  let canvas = null;
  if (typeof target === 'string') {
    canvas = document.querySelector(target);
  } else if (target && target.tagName === 'CANVAS') {
    canvas = target;
  }
  if (!canvas) return false;
  // resize for crisp rendering
  const dpr = (window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 96;
  const h = canvas.clientHeight || 32;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  return renderPieIntoCanvas(canvas, piePath, options);
}
