// The "Invite a family" page: https://getfamplan.app/r#<code>
//
// The code stays in the fragment. preview_referral(p_code) returns only the
// first name of the adult who shared the link (text), or null for an unknown
// code (supabase/migrations/20261108040000_referrals.sql). Nothing is stored.
(function () {
  'use strict';

  var F = window.Famplan;
  var h = F.h;
  // Same alphabet as referral_codes.code: no 0, 1, I or O.
  var CODE = /^[2-9A-HJ-NP-Z]{8}$/;

  var root = document.getElementById('referral');
  var code = decodeURIComponent((location.hash || '').slice(1)).trim().toUpperCase().replace(/-/g, '');

  function show(nodes) {
    root.replaceChildren.apply(root, nodes);
    root.setAttribute('aria-busy', 'false');
  }

  function openButton() {
    return h('p', { class: 'actions' }, [
      h('a', { class: 'button button-primary button-block', href: 'famplan://r/' + code, text: 'Open in Famplan' }),
    ]);
  }

  function noAppNote(name) {
    return h('div', { class: 'group' }, [
      h('h2', { text: 'Don’t have Famplan yet?' }),
      h('p', null, [
        'Famplan is in a closed test, so it isn’t in the app stores yet. Ask ',
        name || 'the person who sent this link',
        ' to add you as a tester. Once it’s installed, come back here and tap Open in Famplan.',
      ]),
      h('p', { class: 'secondary', text: 'Keep this link: your month of Plus comes from opening it in the app.' }),
    ]);
  }

  function renderValid(name) {
    show([
      h('h1', { text: name + ' invited you to Famplan' }),
      h('p', { class: 'lead', text: 'Set up your family and you both get a month of Famplan Plus.' }),
      h('div', { class: 'group raised' }, [
        h('p', { class: 'label', text: 'How it works' }),
        h('ol', null, [
          h('li', { text: 'Open this link in Famplan.' }),
          h('li', { text: 'Set up your family. A child and one schedule is enough.' }),
          h('li', { text: 'Both families get a month of Plus.' }),
        ]),
        h('p', { class: 'secondary', text: 'For families new to Famplan, within their first 30 days.' }),
      ]),
      openButton(),
      noAppNote(name),
    ]);
  }

  function renderInvalid() {
    show([
      h('h1', { text: 'You’re invited to Famplan' }),
      F.message('warning', 'This link doesn’t work.', 'Check it was copied in full, or ask for it again.'),
    ]);
  }

  function renderError() {
    var retry = h('button', { class: 'button button-secondary', type: 'button', text: 'Try again' });
    retry.addEventListener('click', load);
    show([
      h('h1', { text: 'You’re invited to Famplan' }),
      F.message('error', 'Couldn’t load the invite.', 'Check your connection and try again.', [h('p', { class: 'actions' }, [retry])]),
      openButton(),
    ]);
  }

  function load() {
    root.setAttribute('aria-busy', 'true');
    F.rpc('preview_referral', { p_code: code })
      .then(function (name) {
        if (typeof name === 'string' && name.trim()) renderValid(name.trim());
        else renderInvalid();
      })
      .catch(renderError);
  }

  if (!CODE.test(code)) renderInvalid();
  else load();

  window.addEventListener('hashchange', function () {
    location.reload();
  });
})();
