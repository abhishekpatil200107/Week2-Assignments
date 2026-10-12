/** Validate and normalise an employee payload. Returns { errors, value }. */
function validateEmployee(body) {
  const errors = {};
  const b = body && typeof body === 'object' ? body : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  const name = str(b.name);
  if (!name) errors.name = 'Name is required.';
  else if (name.length < 2 || name.length > 100) errors.name = 'Name must be 2-100 characters.';
  else if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) errors.name = 'Name can only contain letters, spaces, apostrophes, dots and hyphens.';

  const department = str(b.department);
  if (!department) errors.department = 'Department is required.';
  else if (department.length < 2 || department.length > 50) errors.department = 'Department must be 2-50 characters.';

  const role = str(b.role);
  if (!role) errors.role = 'Role is required.';
  else if (role.length < 2 || role.length > 80) errors.role = 'Role must be 2-80 characters.';

  let salary = b.salary;
  if (typeof salary === 'string' && salary.trim() !== '') salary = Number(salary);
  if (salary === undefined || salary === null || salary === '') errors.salary = 'Salary is required.';
  else if (typeof salary !== 'number' || !Number.isFinite(salary)) errors.salary = 'Salary must be a number.';
  else if (salary <= 0) errors.salary = 'Salary must be greater than 0.';
  else if (salary > 100000000) errors.salary = 'Salary is unrealistically large (max 100,000,000).';

  const join_date = str(b.join_date);
  if (!join_date) errors.join_date = 'Join date is required.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(join_date) || Number.isNaN(Date.parse(join_date)) ||
           new Date(join_date).toISOString().slice(0, 10) !== join_date) {
    errors.join_date = 'Join date must be a valid date (YYYY-MM-DD).';
  } else if (join_date > new Date().toISOString().slice(0, 10)) {
    errors.join_date = 'Join date cannot be in the future.';
  } else if (join_date < '1950-01-01') {
    errors.join_date = 'Join date is too far in the past.';
  }

  return { errors, value: { name, department, role, salary, join_date } };
}

module.exports = { validateEmployee };
