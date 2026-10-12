/* NovaEdge Solutions - navigation + contact form validation */
(function () {
  'use strict';

  /* ---------- Hamburger navigation ---------- */
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.getElementById('nav-menu');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) setMenu(false);
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Contact form validation ---------- */
  var form = document.getElementById('contact-form');
  if (!form) return;

  var rules = {
    name: function (v) {
      if (!v.trim()) return 'Please enter your full name.';
      if (v.trim().length < 2) return 'Name must be at least 2 characters.';
      if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(v.trim())) return 'Name can only contain letters, spaces, . \' and -';
      return '';
    },
    email: function (v) {
      if (!v.trim()) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Enter a valid email, e.g. name@company.com.';
      return '';
    },
    phone: function (v) {
      // optional field
      if (!v.trim()) return '';
      if (!/^[+]?[\d\s()-]{7,16}$/.test(v.trim())) return 'Enter a valid phone number (7-16 digits).';
      return '';
    },
    subject: function (v) {
      return v ? '' : 'Please choose a topic.';
    },
    message: function (v) {
      if (!v.trim()) return 'Please write a message.';
      if (v.trim().length < 20) return 'Message must be at least 20 characters (' + v.trim().length + '/20).';
      if (v.length > 1000) return 'Message is too long (max 1000 characters).';
      return '';
    }
  };

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var msg = rule(input.value);
    var wrap = input.closest('.field');
    var err = wrap.querySelector('.error');
    err.textContent = msg;
    wrap.classList.toggle('is-invalid', !!msg);
    wrap.classList.toggle('is-valid', !msg && input.value.trim() !== '');
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  var fields = form.querySelectorAll('input[name], select[name], textarea[name]');
  fields.forEach(function (input) {
    input.addEventListener('blur', function () { validateField(input); });
    input.addEventListener('input', function () {
      if (input.closest('.field').classList.contains('is-invalid')) validateField(input);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = document.getElementById('form-status');
    status.className = 'form__status';

    var firstBad = null;
    fields.forEach(function (input) {
      if (!validateField(input) && !firstBad) firstBad = input;
    });

    if (firstBad) {
      firstBad.focus();
      return;
    }

    // No backend in this static site: simulate a successful send.
    var name = form.elements.name.value.trim().split(' ')[0];
    status.textContent = 'Thanks, ' + name + '! Your message has been received. We will reply within one business day.';
    status.classList.add('is-success');
    form.reset();
    fields.forEach(function (input) {
      var wrap = input.closest('.field');
      wrap.classList.remove('is-valid', 'is-invalid');
      input.removeAttribute('aria-invalid');
    });
  });
})();
