// Landing page motion. Plays DESIGN.md's authored moments once, as each
// comes into view: the homes and nights settle in, a swap hands two nights
// to another home, a bag gets packed, the year unrolls, and Today turns to
// evening. Without JavaScript, or with Reduce Motion on, the page is static
// and the day/evening switch changes instantly.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = !reduce && 'IntersectionObserver' in window;
  if (motion) root.classList.add('motion');

  function onView(el, fn, threshold) {
    if (!el) return;
    if (!motion) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          io.disconnect();
          fn();
        }
      });
    }, { threshold: threshold || 0.35 });
    io.observe(el);
  }

  function later(ms, fn) {
    return window.setTimeout(fn, ms);
  }

  // Today: afternoon answers tonight, evening answers tomorrow.
  var STATES = {
    day: {
      when: 'Monday 9 November',
      home: 'home-pine',
      mono: 'E',
      label: 'Tonight',
      answer: 'Mia sleeps at Elm Street.',
      line: 'Jo picks up from school at <strong class="num">15:30</strong>.',
      a11y: "Famplan's Today screen in the afternoon: Mia sleeps at Elm Street tonight, Jo picks up from school at 15:30."
    },
    evening: {
      when: 'Monday 9 November · 18:05',
      home: 'home-plum',
      mono: 'H',
      label: 'Tomorrow',
      answer: 'Mia sleeps at Harbour Flat.',
      line: 'Alex picks up at <strong class="num">15:30</strong>. Back at Elm Street on Friday.',
      a11y: "Famplan's Today screen in the evening: tomorrow Mia sleeps at Harbour Flat, Alex picks up at 15:30, back at Elm Street on Friday."
    }
  };

  function setupToday() {
    var phone = document.querySelector('[data-phone]');
    if (!phone) return;
    var place = phone.querySelector('[data-place]');
    var buttons = document.querySelectorAll('[data-time]');
    var parts = {};
    phone.querySelectorAll('[data-k]').forEach(function (el) {
      parts[el.getAttribute('data-k')] = el;
    });
    var current = 'day';
    var touched = false;

    function show(name) {
      if (name === current) return;
      current = name;
      var s = STATES[name];
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-time') === name));
      });
      phone.setAttribute('aria-label', s.a11y);
      place.classList.add('swapping');
      later(motion ? 140 : 0, function () {
        place.classList.remove('home-pine', 'home-plum');
        place.classList.add(s.home);
        place.classList.toggle('evening', name === 'evening');
        parts.when.textContent = s.when;
        parts.mono.textContent = s.mono;
        parts.label.textContent = s.label;
        parts.answer.textContent = s.answer;
        parts.line.innerHTML = s.line;
        place.classList.remove('swapping');
      });
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        touched = true;
        show(b.getAttribute('data-time'));
      });
    });

    // The bag gets packed, then the evening comes, unless someone chose first.
    onView(phone, function () {
      later(900, function () {
        var row = phone.querySelector('[data-tick]');
        if (!row) return;
        row.classList.add('ticked');
        later(220, function () {
          row.querySelector('[data-k-detail]').innerHTML = 'Packed by Jo · <span class="num">07:52</span>';
        });
      });
      later(3200, function () {
        if (!touched) show('evening');
      });
    }, 0.5);
  }

  function setupHero() {
    var band = document.querySelector('[data-band]');
    if (!band) return;
    var cells = band.querySelectorAll('li');
    cells.forEach(function (c, i) {
      c.style.animationDelay = 520 + i * 18 + 'ms';
    });
    document.querySelectorAll('.street li').forEach(function (h, i) {
      h.style.animationDelay = 160 + i * 90 + 'ms';
    });
    if (motion) document.querySelector('.hero').classList.add('go');

    // A swap is accepted: two nights change hands, 240ms cross-fade.
    onView(band, function () {
      later(2100, function () {
        band.querySelectorAll('[data-swap]').forEach(function (c) {
          c.classList.remove('home-plum');
          c.classList.add('home-pine');
          c.textContent = 'E';
          c.classList.add('swapped');
        });
        var cap = document.querySelector('[data-band-status]');
        if (cap) cap.classList.add('on');
      });
    }, 0.6);
  }

  function setupYear() {
    var year = document.querySelector('[data-year]');
    if (!year) return;
    year.querySelectorAll('.m').forEach(function (row, i) {
      row.style.animationDelay = i * 70 + 'ms';
    });
    onView(year, function () {
      year.classList.add('unroll');
    }, 0.3);
  }

  function start() {
    setupHero();
    setupToday();
    setupYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
