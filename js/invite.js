// The invite page: https://getfamplan.app/i#<token>
//
// The token stays in the fragment, so it never reaches a server log; this
// script reads it and asks the database's anonymous preview functions, as the
// app's invite screen does (app/src/lib/invite-preview.ts):
//   preview_invite(p_token)          -> [{ inviter_name, circle_name, child_names[], role, household_name }]
//   preview_invite_schedule(p_token) -> [{ child_name, cycle[], anchor, holiday_rule, homes[], confirmed,
//                                          checked, taken_colors[], moves[] }]   (co-parent invites only)
//   invite_status(p_token)           -> [{ state, inviter_name, accepted_by_name }]  (why a link no longer works)
// An empty answer means the link is unknown, used, cancelled or expired.
// Nothing is stored in the browser.
(function () {
  'use strict';

  var F = window.Famplan;
  var h = F.h;
  var TOKEN = /^[0-9a-f]{64}$/;
  var DAY_MS = 86400000;
  var NIGHTS = 14;

  var root = document.getElementById('invite');
  var token = decodeURIComponent((location.hash || '').slice(1)).trim().toLowerCase();

  function show(nodes) {
    root.replaceChildren.apply(root, nodes);
    root.setAttribute('aria-busy', 'false');
  }

  function openButton() {
    return h('p', { class: 'actions' }, [
      h('a', { class: 'button button-primary button-block', href: 'famplan://invite/' + token, text: 'Open in Famplan' }),
    ]);
  }

  function noAppNote(inviter) {
    var who = inviter ? inviter : 'the person who invited you';
    return h('div', { class: 'group' }, [
      h('h2', { text: 'Don’t have Famplan yet?' }),
      h('p', null, [
        'Famplan is in a closed test, so it isn’t in the app stores yet. Ask ',
        who,
        ' to add you as a tester. Once it’s installed, come back here and tap Open in Famplan.',
      ]),
      h('p', { class: 'secondary' }, [
        'Keep this link. An invite works for 14 days after it was sent, and only once.',
      ]),
    ]);
  }

  // --- Nights ------------------------------------------------------------------------

  function toDay(iso) {
    return Math.floor(Date.parse(iso + 'T00:00:00Z') / DAY_MS);
  }

  function localToday() {
    var d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }

  var weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
  var dayNum = new Intl.DateTimeFormat(undefined, { day: 'numeric', timeZone: 'UTC' });
  var longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  /** Which slot (0 or 1) has the night, as app/src/domain/custody.ts householdOnNight does. */
  function slotOnNight(row, day) {
    var moves = Array.isArray(row.moves) ? row.moves : [];
    for (var i = moves.length - 1; i >= 0; i--) {
      var m = moves[i];
      if (day >= toDay(m.starts_on) && day < toDay(m.ends_on)) return m.home;
    }
    var cycle = row.cycle;
    var offset = (((day - toDay(row.anchor)) % cycle.length) + cycle.length) % cycle.length;
    return cycle[offset];
  }

  function validRow(row) {
    return (
      row &&
      Array.isArray(row.cycle) &&
      row.cycle.length > 0 &&
      typeof row.anchor === 'string' &&
      !isNaN(toDay(row.anchor)) &&
      Array.isArray(row.homes) &&
      row.homes.length > 0
    );
  }

  /** Children with the same nights and homes are shown together. */
  function groupRows(rows) {
    var groups = [];
    rows.filter(validRow).forEach(function (row) {
      var key = JSON.stringify([row.cycle, row.anchor, row.homes, row.moves || []]);
      var same = groups.find(function (g) {
        return g.key === key;
      });
      if (same) same.names.push(row.child_name);
      else groups.push({ key: key, names: [row.child_name], row: row });
    });
    return groups;
  }

  function homeChip(home) {
    var chip = h('span', { class: 'chip' }, [
      h('span', { class: 'swatch', 'aria-hidden': 'true' }),
      home.theirs ? home.name + ' (your home)' : home.name,
    ]);
    F.paintHome(chip, home.color);
    return chip;
  }

  function scheduleBlock(group, inviter) {
    var row = group.row;
    var today = localToday();
    var cells = h('ol', { class: 'nights', 'aria-hidden': 'true' });
    var spans = [];
    for (var d = today; d < today + NIGHTS; d++) {
      var slot = slotOnNight(row, d);
      var home = row.homes[slot] || null;
      var date = new Date(d * DAY_MS);
      var cell = h('span', { class: 'night' + (d === today ? ' tonight' : '') }, [
        home ? (home.name || '?').trim().charAt(0).toUpperCase() : '?',
      ]);
      if (home) F.paintHome(cell, home.color);
      cells.appendChild(
        h('li', null, [
          h('span', { class: 'night-day' }, [weekday.format(date), h('span', { class: 'mono', text: dayNum.format(date) })]),
          cell,
        ]),
      );
      var last = spans[spans.length - 1];
      if (last && last.slot === slot) last.count++;
      else spans.push({ slot: slot, start: d, count: 1, home: home });
    }

    // The same nights in words, for screen readers and for anyone who can't tell the colours apart.
    var words = h('ul', { class: 'secondary' });
    spans.forEach(function (s) {
      var name = s.home ? s.home.name : 'Unknown home';
      words.appendChild(
        h('li', {
          text: name + ': ' + s.count + (s.count === 1 ? ' night' : ' nights') + ' from ' + longDate.format(new Date(s.start * DAY_MS)),
        }),
      );
    });

    var legend = h('ul', { class: 'chips' });
    var seen = {};
    row.homes.forEach(function (home) {
      var k = home.name + '|' + home.color;
      if (seen[k]) return;
      seen[k] = true;
      legend.appendChild(h('li', null, [homeChip(home)]));
    });

    var notes = [];
    if (row.confirmed === false) {
      notes.push(
        h('p', { class: 'secondary', text: (inviter || 'They') + ' suggested these nights. You can check them, and suggest changes, in Famplan.' }),
      );
    }
    if (row.holiday_rule) {
      notes.push(h('p', { class: 'secondary', text: 'School holidays can follow their own plan, which the app shows.' }));
    }

    return h('div', { class: 'child-schedule' }, [
      h('h3', { text: F.listNames(group.names) }),
      legend,
      cells,
      words,
    ].concat(notes));
  }

  // --- States ------------------------------------------------------------------------

  function roleLine(p) {
    var home = p.household_name;
    if (p.role === 'parent') return home ? 'You’re invited as a parent. Your home in Famplan: ' + home + '.' : 'You’re invited as a parent.';
    if (p.role === 'partner') return home ? 'You’re invited as a partner at ' + home + '.' : 'You’re invited as a partner.';
    if (p.role === 'carer') return home ? 'You’re invited as a carer for ' + home + '.' : 'You’re invited as a carer for the family.';
    return 'You’re invited to join the family.';
  }

  function renderInvite(p, rows) {
    var inviter = p.inviter_name || 'Someone';
    var nodes = [
      h('h1', { text: inviter + ' invited you to Famplan' }),
      h('p', { class: 'lead', text: roleLine(p) }),
    ];

    var details = h('div', { class: 'group raised' });
    if (p.circle_name) {
      details.appendChild(h('p', { class: 'label', text: 'Family' }));
      details.appendChild(h('p', { text: p.circle_name }));
    }
    var children = Array.isArray(p.child_names) ? p.child_names.filter(Boolean) : [];
    if (children.length) {
      details.appendChild(h('p', { class: 'label', text: children.length === 1 ? 'Child' : 'Children' }));
      var list = h('ul', { class: 'chips' });
      children.forEach(function (n) {
        list.appendChild(h('li', null, [h('span', { class: 'chip chip-plain', text: n })]));
      });
      details.appendChild(list);
    }
    if (details.childNodes.length) nodes.push(details);

    var groups = groupRows(rows || []);
    if (groups.length) {
      var nights = h('section', { class: 'group', 'aria-labelledby': 'nights-title' }, [
        h('h2', { id: 'nights-title', text: 'The next two weeks' }),
        h('p', { class: 'secondary', text: 'Where each night is spent. Tonight has an outline.' }),
      ]);
      groups.forEach(function (g) {
        nights.appendChild(scheduleBlock(g, p.inviter_name));
      });
      nodes.push(nights);
    }

    nodes.push(openButton(), noAppNote(p.inviter_name));
    show(nodes);
  }

  function renderGone(status) {
    var s = status || {};
    var inviter = s.inviter_name;
    var title = 'This invite doesn’t work any more';
    var lead;
    var sentence;
    if (s.state === 'accepted') {
      lead = 'Already used.';
      sentence = s.accepted_by_name
        ? s.accepted_by_name + ' has already joined with this invite. Each invite works once.'
        : 'Someone has already joined with this invite. Each invite works once.';
      if (inviter) sentence += ' If you need your own, ask ' + inviter + ' for a new one.';
    } else if (s.state === 'revoked') {
      lead = 'Cancelled.';
      sentence = (inviter ? inviter + ' cancelled this invite.' : 'This invite was cancelled.') + ' Ask for a new one if you still need it.';
    } else if (s.state === 'expired') {
      lead = 'Expired.';
      sentence = 'Invites work for 14 days. ' + (inviter ? 'Ask ' + inviter + ' to send you a new one.' : 'Ask for a new one.');
    } else {
      title = 'We couldn’t find this invite';
      lead = 'Check the link.';
      sentence = 'Make sure you opened the whole link, or ask the person who invited you to send it again.';
    }
    show([h('h1', { text: title }), F.message('warning', lead, sentence)]);
  }

  function renderBadLink() {
    show([
      h('h1', { text: 'This link isn’t complete' }),
      F.message(
        'warning',
        'Part of the link is missing.',
        'Invite links end in a long code after “#”. Copy the whole link from the message you got, or ask for it again.',
      ),
    ]);
  }

  function renderError() {
    var retry = h('button', { class: 'button button-secondary', type: 'button', text: 'Try again' });
    retry.addEventListener('click', load);
    show([
      h('h1', { text: 'Your invite' }),
      F.message('error', 'Couldn’t load the invite.', 'Check your connection and try again.', [h('p', { class: 'actions' }, [retry])]),
      openButton(),
    ]);
  }

  function load() {
    root.setAttribute('aria-busy', 'true');
    F.rpc('preview_invite', { p_token: token })
      .then(function (data) {
        var p = Array.isArray(data) ? data[0] : null;
        if (!p) {
          return F.rpc('invite_status', { p_token: token }).then(function (st) {
            renderGone(Array.isArray(st) ? st[0] : null);
          });
        }
        if (p.role === 'parent' && p.household_name) {
          return F.rpc('preview_invite_schedule', { p_token: token })
            .catch(function () {
              return []; // The nights are a bonus; the invite still works without them.
            })
            .then(function (rows) {
              renderInvite(p, Array.isArray(rows) ? rows : []);
            });
        }
        renderInvite(p, []);
      })
      .catch(renderError);
  }

  if (!TOKEN.test(token)) renderBadLink();
  else load();

  // A second invite opened in the same tab changes only the fragment.
  window.addEventListener('hashchange', function () {
    location.reload();
  });
})();
