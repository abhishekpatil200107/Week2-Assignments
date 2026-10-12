(function () {
  'use strict';
  const page = document.body.dataset.page;
  const $ = (id) => document.getElementById(id);

  /* ---------- helpers ---------- */
  async function post(url, body) {
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
    } catch (_e) {
      throw { message: 'Cannot reach the server. Please check your connection and try again.' };
    }
    let data = {};
    try { data = await res.json(); } catch (_e) { /* no body */ }
    if (!res.ok) throw { status: res.status, message: data.error || 'Something went wrong.', details: data.details };
    return data;
  }

  function banner(msg, kind) {
    const b = $('banner');
    b.textContent = msg;
    b.className = 'banner banner--' + (kind || 'error');
    b.hidden = !msg;
  }

  function fieldErrors(map, ids) {
    ids.forEach((f) => {
      const msg = (map && map[f]) || '';
      const err = $('err-' + f);
      if (err) err.textContent = msg;
      const input = document.querySelector('[name="' + f + '"]');
      if (input) { input.classList.toggle('invalid', !!msg); input.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
    });
  }

  function busy(isBusy, label) {
    const b = $('submit');
    b.disabled = isBusy;
    b.textContent = isBusy ? 'Please wait…' : label;
  }

  /* Show / hide password */
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.getAttribute('aria-controls'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* If already logged in, skip straight to the dashboard */
  fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => { if (r.ok) location.replace('/dashboard'); }).catch(() => {});

  /* ---------- Register page ---------- */
  if (page === 'register') {
    const form = $('register-form');
    const pw = $('password'), user = $('username');
    const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function rules() {
      const v = pw.value, u = user.value.trim().toLowerCase();
      return {
        len: v.length >= 8,
        letter: /[A-Za-z]/.test(v),
        digit: /\d/.test(v),
        user: !(u && v.toLowerCase().includes(u)),
      };
    }
    function paintRules() {
      const r = rules();
      document.querySelectorAll('#rules li').forEach((li) => li.classList.toggle('met', pw.value !== '' && r[li.dataset.rule]));
    }
    pw.addEventListener('input', paintRules);
    user.addEventListener('input', paintRules);

    function validate(v) {
      const e = {};
      if (!v.email) e.email = 'Email is required.';
      else if (!RE_EMAIL.test(v.email)) e.email = 'Enter a valid email address.';
      if (!v.username) e.username = 'Username is required.';
      else if (!/^[A-Za-z0-9_]{3,30}$/.test(v.username)) e.username = 'Use 3-30 letters, numbers or underscores.';
      const r = rules();
      if (!v.password) e.password = 'Password is required.';
      else if (!r.len) e.password = 'Password must be at least 8 characters.';
      else if (!r.letter || !r.digit) e.password = 'Password needs at least one letter and one number.';
      else if (!r.user) e.password = 'Password must not contain your username.';
      if (v.confirm !== v.password) e.confirm = 'Passwords do not match.';
      return e;
    }

    const FIELDS = ['email', 'username', 'password', 'confirm'];
    const values = () => ({ email: $('email').value.trim(), username: user.value.trim(), password: pw.value, confirm: $('confirm').value });

    // Once a field has shown an error, re-check it on every keystroke so the message clears as soon as it is fixed
    FIELDS.forEach((f) => {
      document.querySelector('[name="' + f + '"]').addEventListener('input', () => {
        const errs = validate(values());
        const live = {};
        FIELDS.forEach((g) => { if ($('err-' + g).textContent) live[g] = errs[g] || ''; });
        fieldErrors(live, FIELDS.filter((g) => g in live));
      });
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      banner('');
      const v = values();
      const errs = validate(v);
      fieldErrors(errs, ['email', 'username', 'password', 'confirm']);
      const first = ['email', 'username', 'password', 'confirm'].find((f) => errs[f]);
      if (first) { document.querySelector('[name="' + first + '"]').focus(); return; }

      busy(true);
      try {
        await post('/api/auth/register', { email: v.email, username: v.username, password: v.password });
        location.href = '/login.html?registered=1';
      } catch (e) {
        if (e.details) fieldErrors(e.details, ['email', 'username', 'password', 'confirm']);
        banner(e.status === 409 || e.status === 400 ? 'Please fix the highlighted fields.' : e.message);
        if (e.status === 429) banner(e.message);
      } finally { busy(false, 'Create account'); }
    });
  }

  /* ---------- Login page ---------- */
  if (page === 'login') {
    const params = new URLSearchParams(location.search);
    if (params.get('registered')) banner('Account created! Log in with your new credentials.', 'ok');
    if (params.get('expired')) banner('Your session expired. Please log in again.', 'error');
    if (params.get('loggedout')) banner('You have been logged out.', 'ok');

    ['identifier', 'password'].forEach((id) => $(id).addEventListener('input', () => {
      fieldErrors({}, [id === 'identifier' ? 'email' : 'password']);
    }));

    $('login-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      banner('');
      const identifier = $('identifier').value.trim();
      const password = $('password').value;
      const errs = {};
      if (!identifier) errs.email = 'Enter your email or username.';
      if (!password) errs.password = 'Enter your password.';
      fieldErrors(errs, ['email', 'password']);
      if (errs.email) return $('identifier').focus();
      if (errs.password) return $('password').focus();

      busy(true);
      try {
        await post('/api/auth/login', { email: identifier, password });
        location.href = '/dashboard';
      } catch (e) {
        banner(e.message);                    // e.g. "Invalid email/username or password."
        $('password').value = '';
        $('password').focus();
      } finally { busy(false, 'Log in'); }
    });
  }
})();
