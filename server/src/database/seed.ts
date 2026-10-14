import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export async function seedDatabase() {
  console.log('🌱 Seeding Mentor360 with SVIT College Demo Data on Neon DB...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Roles
    console.log('Inserting Roles...');
    const roles = [
      { code: 'SUPER_ADMIN', name: 'Super Administrator', level: 1 },
      { code: 'UNIVERSITY_ADMIN', name: 'University Administrator', level: 2 },
      { code: 'INSTITUTION_ADMIN', name: 'Institution Administrator', level: 3 },
      { code: 'PRINCIPAL', name: 'Principal / Director', level: 4 },
      { code: 'DEAN', name: 'Dean Academics', level: 5 },
      { code: 'HOD', name: 'Head of Department', level: 6 },
      { code: 'PROCTOR_COORDINATOR', name: 'Proctor Coordinator', level: 7 },
      { code: 'PROCTOR', name: 'Faculty / Proctor / Mentor', level: 8 },
      { code: 'STUDENT', name: 'Student', level: 9 },
      { code: 'PARENT', name: 'Parent / Guardian', level: 10 },
      { code: 'COUNSELLOR', name: 'Institutional Counsellor', level: 11 },
      { code: 'PLACEMENT_OFFICER', name: 'Placement Officer', level: 12 },
      { code: 'IQAC_ADMIN', name: 'IQAC / Accreditation Admin', level: 13 },
    ];

    for (const r of roles) {
      await client.query(
        `INSERT INTO roles (code, name, hierarchy_level) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (code) DO NOTHING`,
        [r.code, r.name, r.level]
      );
    }

    // 2. Institution
    console.log('Inserting Institution SVIT...');
    const instRes = await client.query(
      `INSERT INTO institutions (code, name, slug, status, settings)
       VALUES ('SVIT-BLR', 'Sai Vidya Institute of Technology', 'svit-bangalore', 'ACTIVE', '{"university": "VTU", "tier": "ENTERPRISE", "maxStudents": 2500}')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, settings = EXCLUDED.settings
       RETURNING id`
    );
    const institutionId = instRes.rows[0].id;

    // 2b. Secondary Institution for Multi-Tenant Demonstrations
    console.log('Inserting Secondary Institution BMSIT for Multi-Tenant Showcase...');
    await client.query(
      `INSERT INTO institutions (code, name, slug, status, settings)
       VALUES ('BMSIT-BLR', 'BMS Institute of Technology & Management', 'bmsit-bangalore', 'ACTIVE', '{"university": "VTU", "tier": "ENTERPRISE", "maxStudents": 3000}')
       ON CONFLICT (code) DO NOTHING`
    );

    // 3. Academic Year
    console.log('Inserting Academic Year...');
    const ayRes = await client.query(
      `INSERT INTO academic_years (institution_id, name, start_date, end_date, is_current)
       VALUES ($1, '2024-2025', '2024-08-01', '2025-06-30', true)
       ON CONFLICT (institution_id, name) DO UPDATE SET is_current = true
       RETURNING id`,
      [institutionId]
    );
    const academicYearId = ayRes.rows[0].id;

    // 4. Departments
    console.log('Inserting Departments...');
    const deptRes = await client.query(
      `INSERT INTO departments (institution_id, code, name)
       VALUES ($1, 'CSE', 'Computer Science & Engineering')
       ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [institutionId]
    );
    const departmentId = deptRes.rows[0].id;

    const eceDept = await client.query(
      `INSERT INTO departments (institution_id, code, name)
       VALUES ($1, 'ECE', 'Electronics & Communication Engineering')
       ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [institutionId]
    );

    const iseDept = await client.query(
      `INSERT INTO departments (institution_id, code, name)
       VALUES ($1, 'ISE', 'Information Science & Engineering')
       ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [institutionId]
    );

    // 5. Programme
    console.log('Inserting Programme...');
    const progRes = await client.query(
      `INSERT INTO programmes (institution_id, department_id, code, name, degree_level, total_semesters)
       VALUES ($1, $2, 'B_TECH_CSE', 'Bachelor of Engineering in CSE', 'UG', 8)
       ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [institutionId, departmentId]
    );
    const programmeId = progRes.rows[0].id;

    // 6. Batch
    const batchRes = await client.query(
      `INSERT INTO batches (institution_id, programme_id, name, admission_year, graduation_year)
       VALUES ($1, $2, '2022-2026', 2022, 2026)
       RETURNING id`,
      [institutionId, programmeId]
    );
    const batchId = batchRes.rows[0].id;

    // 7. Users Password
    const hashedPassword = await bcrypt.hash('Password@123', 10);

    // Super Admin User
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role_code, status)
       VALUES ('admin@mentor360.com', $1, 'System Super Admin', '9876543210', 'SUPER_ADMIN', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $1`,
      [hashedPassword]
    );

    // University Admin User
    await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'univ.admin@vtu.ac.in', $2, 'Dr. K. Balaveera Reddy (VTU Vice-Chancellor)', '9876543220', 'UNIVERSITY_ADMIN', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [institutionId, hashedPassword]
    );

    // Institution Admin
    await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'admin@svit.edu.in', $2, 'SVIT Campus Administrator', '9876543221', 'INSTITUTION_ADMIN', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [institutionId, hashedPassword]
    );

    // Principal / Director
    await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'principal@svit.edu.in', $2, 'Dr. H.S. Ramesh (Principal & Director)', '9876543211', 'PRINCIPAL', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [institutionId, hashedPassword]
    );

    // Dean Academics
    const deanUser = await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'dean.academics@svit.edu.in', $2, 'Dr. C.B. Shivamurthy (Dean Academics)', '9876543222', 'DEAN', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [institutionId, hashedPassword]
    );
    await client.query(
      `INSERT INTO faculty (institution_id, user_id, department_id, employee_id, designation, specialization)
       VALUES ($1, $2, $3, 'EMP-DEAN-001', 'Dean & Senior Professor', 'VLSI & Computer Architecture')
       ON CONFLICT (institution_id, employee_id) DO NOTHING`,
      [institutionId, deanUser.rows[0].id, departmentId]
    );

    // HOD User
    const hodRes = await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'hod.cse@svit.edu.in', $2, 'Dr. K. Shantala (HOD CSE)', '9876543212', 'HOD', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [institutionId, hashedPassword]
    );
    await client.query(
      `INSERT INTO faculty (institution_id, user_id, department_id, employee_id, designation, specialization)
       VALUES ($1, $2, $3, 'EMP-HOD-001', 'Professor & HOD', 'Information Security & Data Science')
       ON CONFLICT (institution_id, employee_id) DO NOTHING`,
      [institutionId, hodRes.rows[0].id, departmentId]
    );

    // Proctor Coordinator
    const coordUser = await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'proctor.coord@svit.edu.in', $2, 'Prof. Vinay Kumar (Chief Proctor Coordinator)', '9876543223', 'PROCTOR_COORDINATOR', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [institutionId, hashedPassword]
    );
    await client.query(
      `INSERT INTO faculty (institution_id, user_id, department_id, employee_id, designation, specialization)
       VALUES ($1, $2, $3, 'EMP-COORD-001', 'Associate Professor & Proctor Head', 'System Software')
       ON CONFLICT (institution_id, employee_id) DO NOTHING`,
      [institutionId, coordUser.rows[0].id, departmentId]
    );

    // Placement Officer
    await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'placement@svit.edu.in', $2, 'Prof. Rajeshwari S. (Head of Training & Placement)', '9876543224', 'PLACEMENT_OFFICER', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [institutionId, hashedPassword]
    );

    // IQAC / Accreditation Admin
    await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'iqac@svit.edu.in', $2, 'Dr. Venkatesh M. (Director - IQAC Accreditation)', '9876543225', 'IQAC_ADMIN', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [institutionId, hashedPassword]
    );

    // Proctor / Faculty 1
    const proctor1User = await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'mentor.ramesh@svit.edu.in', $2, 'Prof. Ramesh Kumar', '9876543213', 'PROCTOR', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [institutionId, hashedPassword]
    );
    const faculty1Res = await client.query(
      `INSERT INTO faculty (institution_id, user_id, department_id, employee_id, designation, specialization)
       VALUES ($1, $2, $3, 'EMP-CSE-101', 'Associate Professor', 'Cloud Computing & Networks')
       ON CONFLICT (institution_id, employee_id) DO UPDATE SET designation = EXCLUDED.designation
       RETURNING id`,
      [institutionId, proctor1User.rows[0].id, departmentId]
    );
    const faculty1Id = faculty1Res.rows[0].id;

    // Proctor / Faculty 2
    const proctor2User = await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'mentor.priya@svit.edu.in', $2, 'Dr. Priya Sharma', '9876543214', 'PROCTOR', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [institutionId, hashedPassword]
    );
    const faculty2Res = await client.query(
      `INSERT INTO faculty (institution_id, user_id, department_id, employee_id, designation, specialization)
       VALUES ($1, $2, $3, 'EMP-CSE-102', 'Assistant Professor', 'Artificial Intelligence')
       ON CONFLICT (institution_id, employee_id) DO UPDATE SET designation = EXCLUDED.designation
       RETURNING id`,
      [institutionId, proctor2User.rows[0].id, departmentId]
    );
    const faculty2Id = faculty2Res.rows[0].id;

    // Counsellor User
    await client.query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, 'counsellor@svit.edu.in', $2, 'Dr. Meera Rao (Chief Student Counsellor)', '9876543215', 'COUNSELLOR', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [institutionId, hashedPassword]
    );

    // 8. Students
    console.log('Inserting Students & Digital Proctor Records...');
    const studentsData = [
      {
        usn: '1SV22CS001',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@svit.edu.in',
        phone: '9123456780',
        sem: 5,
        sec: 'A',
        facultyId: faculty1Id,
      },
      {
        usn: '1SV22CS002',
        name: 'Sneha Patel',
        email: 'sneha.patel@svit.edu.in',
        phone: '9123456781',
        sem: 5,
        sec: 'A',
        facultyId: faculty1Id,
      },
      {
        usn: '1SV22CS003',
        name: 'Rohan Verma',
        email: 'rohan.verma@svit.edu.in',
        phone: '9123456782',
        sem: 5,
        sec: 'B',
        facultyId: faculty2Id,
      },
      {
        usn: '1SV22CS004',
        name: 'Ananya Reddy',
        email: 'ananya.reddy@svit.edu.in',
        phone: '9123456783',
        sem: 5,
        sec: 'B',
        facultyId: faculty2Id,
      },
    ];

    const studentIds: string[] = [];

    for (const s of studentsData) {
      // User account for student
      const sUser = await client.query(
        `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
         VALUES ($1, $2, $3, $4, $5, 'STUDENT', 'ACTIVE')
         ON CONFLICT (email) DO UPDATE SET password_hash = $3
         RETURNING id`,
        [institutionId, s.email, hashedPassword, s.name, s.phone]
      );

      const stuRes = await client.query(
        `INSERT INTO students (
           institution_id, user_id, department_id, programme_id, batch_id,
           usn, full_name, email, phone, current_semester, current_section, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')
         ON CONFLICT (institution_id, usn) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [
          institutionId,
          sUser.rows[0].id,
          departmentId,
          programmeId,
          batchId,
          s.usn,
          s.name,
          s.email,
          s.phone,
          s.sem,
          s.sec,
        ]
      );
      const studentId = stuRes.rows[0].id;
      studentIds.push(studentId);

      // Proctor Allocation
      await client.query(
        `INSERT INTO proctor_allocations (
           institution_id, student_id, faculty_id, academic_year_id, semester_number, status, allocated_date
         )
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_DATE)
         ON CONFLICT DO NOTHING`,
        [institutionId, studentId, s.facultyId, academicYearId, s.sem]
      );

      // Parent User & Guardian
      const gUser = await client.query(
        `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
         VALUES ($1, $2, $3, $4, $5, 'PARENT', 'ACTIVE')
         ON CONFLICT (email) DO UPDATE SET password_hash = $3
         RETURNING id`,
        [
          institutionId,
          `parent.${s.usn.toLowerCase()}@example.com`,
          hashedPassword,
          `${s.name}'s Guardian`,
          '9811122233',
        ]
      );

      const guardianRes = await client.query(
        `INSERT INTO guardians (institution_id, user_id, name, relation, phone, email)
         VALUES ($1, $2, $3, 'Father', '9811122233', $4)
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
         RETURNING id`,
        [institutionId, gUser.rows[0].id, `${s.name}'s Guardian`, `parent.${s.usn.toLowerCase()}@example.com`]
      );

      await client.query(
        `INSERT INTO student_guardians (student_id, guardian_id, is_primary, verified)
         VALUES ($1, $2, true, true)
         ON CONFLICT (student_id, guardian_id) DO NOTHING`,
        [studentId, guardianRes.rows[0].id]
      );
    }

    // 9. Subjects
    console.log('Inserting VTU 5th Sem Subjects...');
    const subjects = [
      { code: '21CS51', name: 'Management and Entrepreneurship for IT Industry', credits: 3 },
      { code: '21CS52', name: 'Computer Networks', credits: 4 },
      { code: '21CS53', name: 'Database Management Systems', credits: 4 },
      { code: '21CS54', name: 'Theory of Computation / Automata', credits: 3 },
    ];

    const subjectIds: string[] = [];
    for (const sub of subjects) {
      const subRes = await client.query(
        `INSERT INTO subjects (institution_id, programme_id, code, name, semester_number, credits)
         VALUES ($1, $2, $3, $4, 5, $5)
         ON CONFLICT (institution_id, programme_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [institutionId, programmeId, sub.code, sub.name, sub.credits]
      );
      subjectIds.push(subRes.rows[0].id);
    }

    // 10. Marks & Attendance for Aarav Sharma (studentIds[0]) & Sneha Patel (studentIds[1])
    console.log('Inserting Academic IA Marks & Attendance...');
    // Aarav: High performer (Fast Learner)
    const aaravMarks = [
      { subIdx: 0, ia1: 44.0, ia2: 46.0, avg: 45.0, vtu: 88.0, grade: 'S', attH: 40, attA: 38 },
      { subIdx: 1, ia1: 42.0, ia2: 45.0, avg: 43.5, vtu: 82.0, grade: 'A', attH: 45, attA: 42 },
      { subIdx: 2, ia1: 48.0, ia2: 49.0, avg: 48.5, vtu: 91.0, grade: 'S', attH: 42, attA: 40 },
      { subIdx: 3, ia1: 39.0, ia2: 41.0, avg: 40.0, vtu: 78.0, grade: 'B', attH: 38, attA: 35 },
    ];

    for (const m of aaravMarks) {
      await client.query(
        `INSERT INTO mark_records (
           institution_id, student_id, subject_id, semester_number, ia1_marks, ia2_marks, avg_ia_marks, vtu_external_marks, total_marks, grade, is_backlog
         )
         VALUES ($1, $2, $3, 5, $4, $5, $6, $7, $8, $9, false)
         ON CONFLICT (student_id, subject_id, semester_number) DO UPDATE SET avg_ia_marks = EXCLUDED.avg_ia_marks`,
        [
          institutionId,
          studentIds[0],
          subjectIds[m.subIdx],
          m.ia1,
          m.ia2,
          m.avg,
          m.vtu,
          m.avg + (m.vtu / 2),
          m.grade,
        ]
      );

      await client.query(
        `INSERT INTO attendance_records (
           institution_id, student_id, subject_id, semester_number, classes_held, classes_attended, is_shortage
         )
         VALUES ($1, $2, $3, 5, $4, $5, false)
         ON CONFLICT (student_id, subject_id, semester_number) DO UPDATE SET classes_attended = EXCLUDED.classes_attended`,
        [institutionId, studentIds[0], subjectIds[m.subIdx], m.attH, m.attA]
      );
    }

    // Sneha: Student with Attendance Shortage & IA Concern (Slow Learner / Risk Case)
    const snehaMarks = [
      { subIdx: 0, ia1: 24.0, ia2: 28.0, avg: 26.0, vtu: null, grade: null, attH: 40, attA: 26, isShort: true },
      { subIdx: 1, ia1: 20.0, ia2: 22.0, avg: 21.0, vtu: null, grade: null, attH: 45, attA: 29, isShort: true },
      { subIdx: 2, ia1: 31.0, ia2: 34.0, avg: 32.5, vtu: null, grade: null, attH: 42, attA: 34, isShort: false },
      { subIdx: 3, ia1: 18.0, ia2: 20.0, avg: 19.0, vtu: null, grade: null, attH: 38, attA: 24, isShort: true },
    ];

    for (const m of snehaMarks) {
      await client.query(
        `INSERT INTO mark_records (
           institution_id, student_id, subject_id, semester_number, ia1_marks, ia2_marks, avg_ia_marks, vtu_external_marks, total_marks, grade, is_backlog
         )
         VALUES ($1, $2, $3, 5, $4, $5, $6, $7, null, $8, false)
         ON CONFLICT (student_id, subject_id, semester_number) DO UPDATE SET avg_ia_marks = EXCLUDED.avg_ia_marks`,
        [
          institutionId,
          studentIds[1],
          subjectIds[m.subIdx],
          m.ia1,
          m.ia2,
          m.avg,
          m.vtu,
          m.grade,
        ]
      );

      await client.query(
        `INSERT INTO attendance_records (
           institution_id, student_id, subject_id, semester_number, classes_held, classes_attended, is_shortage
         )
         VALUES ($1, $2, $3, 5, $4, $5, $6)
         ON CONFLICT (student_id, subject_id, semester_number) DO UPDATE SET classes_attended = EXCLUDED.classes_attended`,
        [institutionId, studentIds[1], subjectIds[m.subIdx], m.attH, m.attA, m.isShort]
      );
    }

    // Result Summaries
    await client.query(
      `INSERT INTO result_summaries (institution_id, student_id, semester_number, sgpa, cgpa, active_backlogs, academic_standing)
       VALUES ($1, $2, 5, 8.85, 8.72, 0, 'GOOD')
       ON CONFLICT (student_id, semester_number) DO UPDATE SET sgpa = 8.85, cgpa = 8.72`,
      [institutionId, studentIds[0]]
    );

    await client.query(
      `INSERT INTO result_summaries (institution_id, student_id, semester_number, sgpa, cgpa, active_backlogs, academic_standing)
       VALUES ($1, $2, 5, 6.20, 6.45, 1, 'PROBATION')
       ON CONFLICT (student_id, semester_number) DO UPDATE SET sgpa = 6.20, cgpa = 6.45`,
      [institutionId, studentIds[1]]
    );

    // 11. Mentoring Meetings
    console.log('Inserting Mentoring Meetings...');
    const meetingRes = await client.query(
      `INSERT INTO mentoring_meetings (
         institution_id, faculty_id, title, meeting_type, scheduled_at, venue, status, general_remarks
       )
       VALUES ($1, $2, 'Semester 5 Initial Mentoring & IA Review', 'INDIVIDUAL', NOW() - INTERVAL '3 days', 'Cabin 304', 'COMPLETED', 'Discussed IA-1 preparation and elective selection')
       RETURNING id`,
      [institutionId, faculty1Id]
    );

    await client.query(
      `INSERT INTO meeting_participants (
         meeting_id, student_id, attendance_status, discussion_notes, identified_challenges, student_feedback
       )
       VALUES ($1, $2, 'PRESENT', 'Student is performing very well in core programming subjects. Encouraged to take NPTEL certification in Cloud Architecture.', 'None reported', 'Very satisfied with faculty guidance.')
       ON CONFLICT (meeting_id, student_id) DO NOTHING`,
      [meetingRes.rows[0].id, studentIds[0]]
    );

    // 12. Student Risk / Intervention for Sneha Patel
    console.log('Inserting Student Concerns & Action Plans...');
    const issueRes = await client.query(
      `INSERT INTO student_issues (
         institution_id, student_id, raised_by, category, severity, title, description, status
       )
       VALUES ($1, $2, $3, 'ATTENDANCE', 'HIGH', 'Severe Attendance Shortage in Automata & Networks (< 65%)', 'Student was absent due to typhoid illness in September. Medical certificate submitted but IA 1 scores dropped.', 'OPEN')
       RETURNING id`,
      [institutionId, studentIds[1], proctor1User.rows[0].id]
    );

    const planRes = await client.query(
      `INSERT INTO action_plans (
         issue_id, title, objective, assigned_to, target_date, status
       )
       VALUES ($1, 'Attendance Recovery & Remedial Classes Plan', 'Attend 8 remedial classes on weekends and score above 35 in IA-2', $2, CURRENT_DATE + INTERVAL '14 days', 'IN_PROGRESS')
       RETURNING id`,
      [issueRes.rows[0].id, proctor1User.rows[0].id]
    );

    await client.query(
      `INSERT INTO follow_ups (
         action_plan_id, conducted_by, progress_notes, outcome
       )
       VALUES ($1, $2, 'Met with student and guardian on Monday. Guardian committed to monitoring morning bus commute. 4 remedial classes completed.', 'ON_TRACK')`,
      [planRes.rows[0].id, proctor1User.rows[0].id]
    );

    // 13. Student Skills, Development, Goals & Internships
    console.log('Inserting Student Skills, Certifications & Internships...');
    const skillsList = [
      { name: 'Python Programming', category: 'TECHNICAL' },
      { name: 'Cloud Architecture (AWS)', category: 'TECHNICAL' },
      { name: 'Full-Stack Web Dev', category: 'TECHNICAL' },
      { name: 'Communication & Leadership', category: 'SOFT_SKILL' },
    ];

    for (const sk of skillsList) {
      const skRes = await client.query(
        `INSERT INTO skills (institution_id, name, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (institution_id, name) DO UPDATE SET category = EXCLUDED.category
         RETURNING id`,
        [institutionId, sk.name, sk.category]
      );

      await client.query(
        `INSERT INTO student_skills (student_id, skill_id, proficiency)
         VALUES ($1, $2, 'ADVANCED')
         ON CONFLICT (student_id, skill_id) DO NOTHING`,
        [studentIds[0], skRes.rows[0].id]
      );
    }

    await client.query(
      `INSERT INTO student_goals (student_id, title, target_date, status, progress_percentage)
       VALUES ($1, 'Complete AWS Certified Solutions Architect Associate', CURRENT_DATE + INTERVAL '60 days', 'IN_PROGRESS', 65)`,
      [studentIds[0]]
    );

    await client.query(
      `INSERT INTO certificates (student_id, title, issuing_org, issue_date, certificate_url, verified)
       VALUES ($1, 'Full Stack Web Development with React & Node.js', 'Coursera', CURRENT_DATE - INTERVAL '90 days', 'https://example.com/certs/aarav_fullstack.pdf', true)`,
      [studentIds[0]]
    );

    await client.query(
      `INSERT INTO internships (student_id, company_name, role, start_date, end_date, stipend_amount, status)
       VALUES ($1, 'Bosch Global Software Technologies', 'Software Engineering Intern', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '3 months', 25000, 'COMPLETED')`,
      [studentIds[0]]
    );

    // 14. Parent Communications
    console.log('Inserting Parent Communications...');
    await client.query(
      `INSERT INTO parent_communications (institution_id, student_id, guardian_id, initiated_by, channel, subject, message, delivery_status)
       SELECT $1, s.id, sg.guardian_id, $2, 'SMS', 'Attendance Shortage Alert - VTU Regulations', 
              'Dear Parent, Your ward Sneha Patel has attendance < 75% in CSE 5th Sem. Remedial sessions scheduled.', 'DELIVERED'
       FROM students s
       JOIN student_guardians sg ON s.id = sg.student_id
       WHERE s.id = $3 LIMIT 1`,
      [institutionId, proctor1User.rows[0].id, studentIds[1]]
    );

    // 15. Reassignment History
    console.log('Inserting Proctor Reassignment History...');
    await client.query(
      `INSERT INTO proctor_reassignments (institution_id, student_id, previous_faculty_id, new_faculty_id, academic_year_id, reassignment_date, reason, approved_by)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '30 days', 'Faculty sabbatical transfer approved by HOD', $6)`,
      [institutionId, studentIds[2], faculty1Id, faculty2Id, academicYearId, hodRes.rows[0].id]
    );

    await client.query('COMMIT');
    console.log('🎉 Seeding successfully completed! SVIT demo environment ready for all 13 roles.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
