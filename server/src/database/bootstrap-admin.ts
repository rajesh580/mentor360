import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'Institution Administrator';
  const institutionCode = process.env.ADMIN_INSTITUTION_CODE?.trim();
  const institutionName = process.env.ADMIN_INSTITUTION_NAME?.trim() || 'Mentor360 Institution';

  if (!email || !password || !institutionCode) {
    throw new Error('Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_INSTITUTION_CODE before bootstrapping the admin account.');
  }
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');

  const slug = institutionCode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const roles = [
    ['SUPER_ADMIN', 'Super Administrator', 1],
    ['UNIVERSITY_ADMIN', 'University Administrator', 2],
    ['INSTITUTION_ADMIN', 'Institution Administrator', 3],
    ['PRINCIPAL', 'Principal / Director', 4],
    ['DEAN', 'Dean Academics', 5],
    ['HOD', 'Head of Department', 6],
    ['PROCTOR_COORDINATOR', 'Proctor Coordinator', 7],
    ['PROCTOR', 'Faculty / Proctor / Mentor', 8],
    ['STUDENT', 'Student', 9],
    ['PARENT', 'Parent / Guardian', 10],
    ['COUNSELLOR', 'Institutional Counsellor', 11],
    ['PLACEMENT_OFFICER', 'Placement Officer', 12],
    ['IQAC_ADMIN', 'IQAC / Accreditation Admin', 13],
  ];
  for (const [code, name, level] of roles) {
    await query(
      `INSERT INTO roles (code, name, hierarchy_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO NOTHING`,
      [code, name, level]
    );
  }
  let institution = await query(
    `INSERT INTO institutions (code, name, slug, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     ON CONFLICT (code) DO NOTHING
     RETURNING id`,
    [institutionCode, institutionName, slug]
  );
  if (!institution.rows.length) {
    institution = await query('SELECT id FROM institutions WHERE code = $1 AND status = $2', [institutionCode, 'ACTIVE']);
  }
  if (!institution.rows.length) throw new Error(`Institution '${institutionCode}' exists but is not active.`);

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (institution_id, email, password_hash, full_name, role_code, status)
     VALUES ($1, $2, $3, $4, 'INSTITUTION_ADMIN', 'ACTIVE')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       status = 'ACTIVE'
     WHERE users.role_code = 'INSTITUTION_ADMIN'
       AND users.institution_id = EXCLUDED.institution_id`,
    [institution.rows[0].id, email, passwordHash, fullName]
  );
  if (!result.rowCount) throw new Error('That email is already assigned to a different account. Choose a new ADMIN_EMAIL.');
  console.log(`Institution admin account provisioned for ${email}.`);
}

bootstrapAdmin()
  .catch((error) => {
    console.error(error.message || 'Failed to provision the institution admin account.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
