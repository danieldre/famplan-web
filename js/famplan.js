// Shared helpers for the invite and referral pages. No dependencies, no storage,
// no cookies. Everything shown comes from the anonymous preview functions, and
// is put on the page as text, never as HTML.
(function () {
  'use strict';

  var config = window.FAMPLAN_CONFIG;

  // DESIGN.md household palette, keyed by the light-mode band hex the database stores.
  var PALETTE = {
    '#037465': { name: 'pine', tint: '#DFF6F1', ink: '#03483E', bandDark: '#4BC1AD', tintDark: '#0B2D27', inkDark: '#9EE1D3' },
    '#814A8D': { name: 'plum', tint: '#F8EBFB', ink: '#512B5A', bandDark: '#CA94D6', tintDark: '#2F2033', inkDark: '#E6C3EE' },
    '#855904': { name: 'ochre', tint: '#FAEEDE', ink: '#533603', bandDark: '#D3A056', tintDark: '#32230E', inkDark: '#ECCB9E' },
    '#006C97': { name: 'ocean', tint: '#E1F3FF', ink: '#01435F', bandDark: '#5EB6E6', tintDark: '#112937', inkDark: '#A4D9F9' },
    '#9C4438': { name: 'brick', tint: '#FEEBE8', ink: '#64271F', bandDark: '#E89081', tintDark: '#381F1B', inkDark: '#FCC1B6' },
    '#437224': { name: 'moss', tint: '#E9F4E4', ink: '#274710', bandDark: '#8CBB73', tintDark: '#1E2B17', inkDark: '#BEDCAE' },
    '#5759A6': { name: 'iris', tint: '#EDEFFF', ink: '#35366B', bandDark: '#9DA3EF', tintDark: '#23243A', inkDark: '#C7CDFF' },
    '#984260': { name: 'rose', tint: '#FEEAEF', ink: '#61253B', bandDark: '#E48DA8', tintDark: '#361E26', inkDark: '#F9BECF' },
  };

  var HEX = /^#[0-9a-fA-F]{6}$/;

  /**
   * Set a home's colours as custom properties on an element. A colour outside
   * the palette (legacy data) is drawn as-is with white text and no dark variant.
   */
  function paintHome(el, color) {
    var band = typeof color === 'string' && HEX.test(color) ? color.toUpperCase() : null;
    if (!band) return;
    var p = PALETTE[band];
    el.style.setProperty('--band', band);
    el.style.setProperty('--on-band', '#FFFFFF');
    if (p) {
      el.style.setProperty('--tint', p.tint);
      el.style.setProperty('--tint-ink', p.ink);
      el.style.setProperty('--band-dark', p.bandDark);
      el.style.setProperty('--on-band-dark', '#121416');
      el.style.setProperty('--tint-dark', p.tintDark);
      el.style.setProperty('--tint-ink-dark', p.inkDark);
    }
  }

  /** POST {url}/rest/v1/rpc/{fn} as an anonymous caller. Resolves to the parsed JSON. */
  function rpc(fn, args) {
    return fetch(config.supabaseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    }).then(function (res) {
      if (!res.ok) throw new Error('rpc ' + fn + ' ' + res.status);
      return res.json();
    });
  }

  /** Make an element; children may be strings (as text) or nodes. */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'text') el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  /** "Mia", "Mia and Zoe", "Mia, Zoe and Ben", in the reader's language where the browser knows how. */
  function listNames(names) {
    try {
      return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(names);
    } catch (e) {
      if (names.length < 2) return names.join('');
      return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    }
  }

  var ICONS = {
    // Phosphor-style outline glyphs, drawn inline so no icon font is loaded.
    warning:
      '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M128 104v40M114.2 40l-88 152A16 16 0 0 0 40 216h176a16 16 0 0 0 13.8-24l-88-152a16 16 0 0 0-27.6 0Z"/><circle cx="128" cy="180" r="12" fill="currentColor"/></svg>',
    info:
      '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-width="16"/><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M120 120h8v56h8"/><circle cx="126" cy="84" r="12" fill="currentColor"/></svg>',
  };

  /** An inline message: icon, bold lead phrase, a plain sentence. */
  function message(kind, lead, sentence, extra) {
    var box = h('div', { class: 'message message-' + kind, role: kind === 'error' ? 'alert' : 'status' });
    var icon = document.createElement('span');
    icon.innerHTML = ICONS[kind === 'info' ? 'info' : 'warning']; // static markup, no data
    box.appendChild(icon.firstChild);
    box.appendChild(h('div', null, [h('p', null, [h('strong', { text: lead }), ' ', sentence])].concat(extra || [])));
    return box;
  }

  window.Famplan = { rpc: rpc, h: h, paintHome: paintHome, listNames: listNames, message: message };
})();
