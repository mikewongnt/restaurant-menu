/*!
 * Ember & Oak — shared UI helpers
 */
(function (global) {
  'use strict';

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const ICONS = {
    cart:
      '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 3h2l2.3 12.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4-4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16Z"/><path d="M4.5 21c1.5-6 5-10 11-12"/>',
    flame:
      '<path d="M12 2.5c.8 3.2 2.4 4.3 3.7 6A7 7 0 0 1 17 13a5 5 0 0 1-10 0c0-2.2 1.2-3.5 2.3-4.6.1 1.7.7 2.8 1.8 3.1.8.2 1.4-.4 1.3-1.3-.2-2.6-.8-5.1-.4-7.7Z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bag: '<path d="M6 7h12l1.2 14H4.8L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
    truck:
      '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
    utensils:
      '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    pin:
      '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    wallet:
      '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    dollar: '<path d="M12 2v20"/><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2 2.8 5 3.5 5 1.4 5 3.5-2.2 3-5 3-5-1.1-5-3"/>',
    ticket:
      '<path d="M4 5h16v4a2 2 0 0 0 0 6v4H4v-4a2 2 0 0 0 0-6V5Z"/><path d="M9 9h6M9 13h4"/>',
    dashboard:
      '<rect x="3" y="3" width="8" height="8" rx="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.6"/><rect x="13" y="13" width="8" height="8" rx="1.6"/>',
    gear:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    tag: '<path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.3v.2"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 4v7h-7"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h12"/>',
  };

  function icon(name, className) {
    const path = ICONS[name] || '';
    return (
      `<svg class="ico${className ? ' ' + className : ''}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ` +
      `aria-hidden="true">${path}</svg>`
    );
  }

  function money(cents) {
    let symbol = '$';
    try {
      symbol = MenuStore.getState().settings.currency || '$';
    } catch (err) {
      symbol = '$';
    }
    const value = (Number(cents) || 0) / 100;
    const formatted = value.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const gap = symbol.length > 1 && !symbol.endsWith(' ') ? ' ' : '';
    return `${symbol}${gap}${formatted}`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function timeLabel(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function relativeTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ------------------------------- toasts -------------------------------- */

  let toastHost = null;

  function toast(message, kind) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }

    const el = document.createElement('div');
    el.className = `toast${kind ? ' toast-' + kind : ''}`;
    el.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check')}<span>${escapeHtml(message)}</span>`;
    toastHost.appendChild(el);

    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 220);
    }, 2600);
  }

  /* ------------------------------ scroll lock ---------------------------- */

  let lockCount = 0;

  function lockScroll() {
    lockCount += 1;
    document.body.classList.add('no-scroll');
  }

  function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.body.classList.remove('no-scroll');
  }

  /* -------------------------------- modals ------------------------------- */

  function modal(html, options) {
    const opts = options || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      `<div class="modal ${opts.className || ''}" role="dialog" aria-modal="true" ` +
      `aria-label="${escapeHtml(opts.label || 'Dialog')}">${html}</div>`;
    document.body.appendChild(overlay);
    lockScroll();

    const modalEl = overlay.querySelector('.modal');

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      const focusTarget =
        modalEl.querySelector('[data-autofocus]') ||
        modalEl.querySelector('button, input, select, textarea, a[href]');
      if (focusTarget) {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (err) {
          /* ignore */
        }
      }
    });

    let closed = false;

    function onKeydown(event) {
      if (event.key === 'Escape' && opts.dismissible !== false) {
        event.preventDefault();
        close();
      }
    }

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeydown);
      overlay.classList.remove('is-open');
      setTimeout(() => {
        overlay.remove();
        unlockScroll();
        if (typeof opts.onClose === 'function') opts.onClose();
      }, 180);
    }

    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay && opts.dismissible !== false) close();
    });

    overlay.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]')) close();
    });

    document.addEventListener('keydown', onKeydown);

    return { overlay, modalEl, close };
  }

  function confirmDialog(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const instance = modal(
        `<div class="confirm-body">
          <div class="confirm-icon ${opts.danger ? 'is-danger' : ''}">${icon(opts.danger ? 'alert' : 'check')}</div>
          <h3>${escapeHtml(opts.title || 'Are you sure?')}</h3>
          <p>${escapeHtml(opts.message || '')}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" data-confirm-no>${escapeHtml(opts.cancelLabel || 'Cancel')}</button>
            <button type="button" class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-confirm-yes>${escapeHtml(
              opts.confirmLabel || 'Confirm'
            )}</button>
          </div>
        </div>`,
        { className: 'modal-sm confirm-modal', label: opts.title || 'Confirm', onClose: () => finish(false) }
      );

      instance.overlay.querySelector('[data-confirm-yes]').addEventListener('click', () => {
        finish(true);
        instance.close();
      });
      instance.overlay.querySelector('[data-confirm-no]').addEventListener('click', () => {
        finish(false);
        instance.close();
      });
    });
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.UI = {
    $,
    $$,
    icon,
    money,
    escapeHtml,
    timeLabel,
    relativeTime,
    debounce,
    toast,
    modal,
    confirmDialog,
    downloadFile,
    lockScroll,
    unlockScroll,
  };
})(window);
