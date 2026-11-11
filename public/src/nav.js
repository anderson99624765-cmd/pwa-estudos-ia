// Navegação por hash, isolada para não criar import circular entre router.js e ui.js.
export function navigate(hash) {
  if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}
