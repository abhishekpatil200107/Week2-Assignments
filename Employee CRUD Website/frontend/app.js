(function () {
  'use strict';

  const API = '/api/employees';
  const $ = (id) => document.getElementById(id);
  const state = { sort: 'id', order: 'asc', search: '', department: '', rows: [], knownDepts: new Set() };
  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  /* ---------------- API helper ---------------- */
  async function api(url, options = {}) {
    let res;
    try {
      res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (e) {
      throw { message: 'Cannot reach the server. Check that the backend is running.' };
    }
    let data = {};
    try { data = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok) throw { message: data.error || `Request failed (${res.status})`, details: data.details, status: res.status };
    return data;
  }

  /* ---------------- UI helpers ---------------- */
  let toastTimer;
  function toast(msg, isError) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }

  function showAlert(msg, retry) {
    const a = $('alert');
    a.textContent = msg + ' ';
    if (retry) {
      const b = document.createElement('button');
      b.className = 'btn btn--sm'; b.type = 'button'; b.textContent = 'Retry';
      b.addEventListener('click', retry);
      a.appendChild(b);
    }
    a.hidden = false;
  }

  /* ---------------- Load + render ---------------- */
  async function load() {
    $('loading').hidden = false;
    $('empty').hidden = true;
    $('alert').hidden = true;
    $('tbody').replaceChildren();
    const qs = new URLSearchParams({ sort: state.sort, order: state.order });
    if (state.search) qs.set('search', state.search);
    if (state.department) qs.set('department', state.department);
    try {
      const { data } = await api(`${API}?${qs}`);
      state.rows = data;
      data.forEach((r) => state.knownDepts.add(r.department));
      render();
      refreshDepartments();
    } catch (e) {
      showAlert(e.message, load);
    } finally {
      $('loading').hidden = true;
    }
  }

  function cell(text, cls) {
    const td = document.createElement('td');
    td.textContent = text;
    if (cls) td.className = cls;
    return td;
  }

  function render() {
    const tbody = $('tbody');
    tbody.replaceChildren();
    state.rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.appendChild(cell(r.name));
      const dtd = document.createElement('td');
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = r.department;
      dtd.appendChild(tag); tr.appendChild(dtd);
      tr.appendChild(cell(r.role));
      tr.appendChild(cell(inr.format(r.salary), 'num'));
      tr.appendChild(cell(new Date(r.join_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })));

      const act = document.createElement('td');
      const wrap = document.createElement('div'); wrap.className = 'row-actions';
      const edit = document.createElement('button');
      edit.className = 'btn btn--sm'; edit.type = 'button'; edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${r.name}`);
      edit.addEventListener('click', () => openForm(r));
      const del = document.createElement('button');
      del.className = 'btn btn--sm btn--danger'; del.type = 'button'; del.textContent = 'Delete';
      del.setAttribute('aria-label', `Delete ${r.name}`);
      del.addEventListener('click', () => openDelete(r));
      wrap.append(edit, del); act.appendChild(wrap); tr.appendChild(act);
      tbody.appendChild(tr);
    });

    const empty = $('empty');
    if (!state.rows.length) {
      empty.textContent = state.search || state.department
        ? 'No employees match your search or filter.'
        : 'No employees yet. Click “Add Employee” to create the first record.';
      empty.hidden = false;
    } else empty.hidden = true;

    // stats
    $('stat-count').textContent = state.rows.length;
    const avg = state.rows.length ? state.rows.reduce((s, r) => s + r.salary, 0) / state.rows.length : 0;
    $('stat-avg').textContent = state.rows.length ? inr.format(avg) : '–';
    $('stat-depts').textContent = new Set(state.rows.map((r) => r.department)).size;

    // sort indicators
    document.querySelectorAll('th[aria-sort]').forEach((th) => {
      const b = th.querySelector('.sort');
      th.setAttribute('aria-sort', b && b.dataset.sort === state.sort ? (state.order === 'asc' ? 'ascending' : 'descending') : 'none');
    });
  }

  function refreshDepartments() {
    const sel = $('dept-filter');
    const current = state.department;
    const names = [...state.knownDepts].sort((a, b) => a.localeCompare(b));
    sel.replaceChildren(new Option('All departments', ''));
    names.forEach((n) => sel.appendChild(new Option(n, n)));
    sel.value = current;
    const dl = $('dept-list'); dl.replaceChildren();
    names.forEach((n) => dl.appendChild(new Option(n)));
  }

  /* ---------------- Search / sort / filter ---------------- */
  let searchTimer;
  $('search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = e.target.value.trim(); load(); }, 250);
  });
  $('dept-filter').addEventListener('change', (e) => { state.department = e.target.value; load(); });
  document.querySelectorAll('.sort').forEach((btn) => btn.addEventListener('click', () => {
    const col = btn.dataset.sort;
    if (state.sort === col) state.order = state.order === 'asc' ? 'desc' : 'asc';
    else { state.sort = col; state.order = 'asc'; }
    load();
  }));

  /* ---------------- Add / Edit form ---------------- */
  const form = $('emp-form');
  const FIELDS = ['name', 'department', 'role', 'salary', 'join_date'];

  function clientValidate(v) {
    const e = {};
    if (!v.name) e.name = 'Name is required.';
    else if (v.name.length < 2) e.name = 'Name must be at least 2 characters.';
    else if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(v.name)) e.name = 'Use letters, spaces, apostrophes, dots or hyphens only.';
    if (!v.department) e.department = 'Department is required.';
    else if (v.department.length < 2) e.department = 'Department must be at least 2 characters.';
    if (!v.role) e.role = 'Role is required.';
    else if (v.role.length < 2) e.role = 'Role must be at least 2 characters.';
    if (v.salary === '') e.salary = 'Salary is required.';
    else if (!(Number(v.salary) > 0)) e.salary = 'Salary must be greater than 0.';
    else if (Number(v.salary) > 100000000) e.salary = 'Salary is too large.';
    if (!v.join_date) e.join_date = 'Join date is required.';
    else if (v.join_date > new Date().toISOString().slice(0, 10)) e.join_date = 'Join date cannot be in the future.';
    return e;
  }

  function showErrors(errors) {
    FIELDS.forEach((f) => {
      $('e-' + f).textContent = errors[f] || '';
      $('f-' + f).classList.toggle('invalid', !!errors[f]);
      $('f-' + f).setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
    });
  }

  function readForm() {
    const v = {};
    FIELDS.forEach((f) => { v[f] = $('f-' + f).value.trim(); });
    return v;
  }

  function openForm(emp) {
    form.reset();
    showErrors({});
    $('e-form').textContent = '';
    $('emp-id').value = emp ? emp.id : '';
    $('form-title').textContent = emp ? 'Edit Employee' : 'Add Employee';
    if (emp) FIELDS.forEach((f) => { $('f-' + f).value = emp[f]; }); // pre-filled
    $('f-join_date').max = new Date().toISOString().slice(0, 10);
    $('form-dialog').showModal();
    $('f-name').focus();
  }

  $('add-btn').addEventListener('click', () => openForm(null));
  $('cancel-btn').addEventListener('click', () => $('form-dialog').close());

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const values = readForm();
    const errors = clientValidate(values);
    showErrors(errors);
    $('e-form').textContent = '';
    const firstBad = FIELDS.find((f) => errors[f]);
    if (firstBad) { $('f-' + firstBad).focus(); return; }

    const id = $('emp-id').value;
    const btn = $('save-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const payload = { ...values, salary: Number(values.salary) };
      await api(id ? `${API}/${id}` : API, { method: id ? 'PUT' : 'POST', body: payload });
      $('form-dialog').close();
      toast(id ? 'Employee updated.' : 'Employee added.');
      await load();
    } catch (e) {
      if (e.details) showErrors(e.details); // server-side field errors
      $('e-form').textContent = e.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  });

  /* ---------------- Delete with confirmation ---------------- */
  let pendingDelete = null;
  function openDelete(emp) {
    pendingDelete = emp;
    $('delete-text').textContent = `This will permanently remove ${emp.name} (${emp.role}, ${emp.department}). This cannot be undone.`;
    $('e-delete').textContent = '';
    $('delete-dialog').showModal();
    $('delete-cancel').focus();
  }
  $('delete-cancel').addEventListener('click', () => $('delete-dialog').close());
  $('delete-confirm').addEventListener('click', async () => {
    const btn = $('delete-confirm');
    btn.disabled = true; btn.textContent = 'Deleting…';
    try {
      await api(`${API}/${pendingDelete.id}`, { method: 'DELETE' });
      $('delete-dialog').close();
      toast('Employee deleted.');
      await load();
    } catch (e) {
      if (e.status === 404) { $('delete-dialog').close(); toast('That employee was already removed.', true); await load(); }
      else $('e-delete').textContent = e.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Delete';
    }
  });

  load();
})();
