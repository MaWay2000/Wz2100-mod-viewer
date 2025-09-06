
// piePreview-init.js - tiny glue that exposes a stable global for the page.
// Some parts of the app import { showPie } from './piePreview.js'.
// Others may call window.WZPIE.showPie(...). We support both.

import { showPie, configurePieBase } from './piePreview.js';

// Expose on a namespaced global for inline scripts (optional)
window.WZPIE = window.WZPIE || {};
window.WZPIE.showPie = showPie;
window.WZPIE.configurePieBase = configurePieBase;

// If the page wants to auto-init a base path, it may provide
// <meta name="pie-base" content="/assets/">; we apply it here.
try {
  const meta = document.querySelector('meta[name="pie-base"][content]');
  if (meta && meta.content) configurePieBase(meta.content);
} catch (_) {}
