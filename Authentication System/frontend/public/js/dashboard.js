(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let timer;

  function toLogin(reason) { location.replace('/login.html' + (reason ? '?' + reason + '=1' : '')); }

  async function get(url) {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) { toLogin('expired'); throw new Error('unauthenticated'); }
    if (!res.ok) throw new Error('Request failed (' + res.status + ')');
    return res.json();
  }

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  async function init() {
    try {
      const me = await get('/api/auth/me');
      const u = me.user;
      document.title = u.username + ' | Dashboard';
      $('welcome').textContent = 'Welcome, ' + u.username + '!';
      $('lead').textContent = 'You are signed in.';
      $('nav-user').textContent = u.username;
      $('p-username').textContent = u.username;
      $('p-email').textContent = u.email;
      $('p-since').textContent = new Date(u.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      const expires = new Date(me.expiresAt).getTime();
      $('s-expires').textContent = new Date(expires).toLocaleTimeString();
      const tick = () => {
        const left = expires - Date.now();
        $('s-remaining').textContent = fmt(left);
        if (left <= 0) { clearInterval(timer); toLogin('expired'); }
      };
      tick();
      timer = setInterval(tick, 1000);

      const data = await get('/api/dashboard');
      $('d-users').textContent = data.totalUsers;
      $('d-message').textContent = data.message;
    } catch (e) {
      if (e.message === 'unauthenticated') return;
      const b = $('banner');
      b.textContent = 'Could not load your dashboard. ' + e.message;
      b.hidden = false;
    }
  }

  $('logout').addEventListener('click', async () => {
    const btn = $('logout');
    btn.disabled = true; btn.textContent = 'Logging out…';
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      location.replace('/login.html?loggedout=1');
    }
  });

  // Back/forward cache: re-check the session when the page is restored from history
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  init();
})();
