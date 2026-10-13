-- ============================================================================
-- MENTOR360 - ENTERPRISE MULTI-TENANT SAAS DATABASE SCHEMA
-- Compatible with PostgreSQL 15/16 (Neon DB)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- MODULE 1: ADMINISTRATION & ACADEMIC STRUCTURE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- e.g., '2024-2025'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_academic_year_inst UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- e.g., 'CSE', 'ECE', 'ISE'
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_dept_inst UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS programmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- e.g., 'B_TECH_CSE'
  name VARCHAR(255) NOT NULL, -- 'B.Tech Computer Science'
  degree_level VARCHAR(50) DEFAULT 'UG', -- 'UG', 'PG', 'DIPLOMA'
  total_semesters INT DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_programme_inst UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- e.g., '2022-2026'
  admission_year INT NOT NULL,
  graduation_year INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  semester_number INT NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
  name VARCHAR(50) NOT NULL, -- 'Semester 1', 'Semester 5'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  name VARCHAR(20) NOT NULL, -- 'A', 'B', 'C'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_section_inst UNIQUE (institution_id, programme_id, semester_number, name)
);

-- ----------------------------------------------------------------------------
-- MODULE 2: USER, ROLE & ACCESS MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR', 'STUDENT', 'PARENT', 'COUNSELLOR'
  name VARCHAR(100) NOT NULL,
  hierarchy_level INT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role_code VARCHAR(50) NOT NULL REFERENCES roles(code),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- MODULE 3: STUDENT, FACULTY & GUARDIAN RECORDS (DIGITAL PROCTOR FILE)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS faculty (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  employee_id VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  specialization VARCHAR(255),
  max_mentees INT DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_faculty_emp UNIQUE (institution_id, employee_id)
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  usn VARCHAR(50) NOT NULL, -- University Seat Number / Roll No
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  dob DATE,
  gender VARCHAR(20),
  blood_group VARCHAR(10),
  permanent_address TEXT,
  current_address TEXT,
  current_semester INT DEFAULT 1,
  current_section VARCHAR(20) DEFAULT 'A',
  profile_photo_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'DROPPED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_student_usn UNIQUE (institution_id, usn)
);

CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  relation VARCHAR(50) NOT NULL, -- 'Father', 'Mother', 'Local Guardian'
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  occupation VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT true,
  CONSTRAINT uq_student_guardian UNIQUE (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'AADHAR', 'MARKSHEET', 'CERTIFICATE', 'MEDICAL'
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  file_data BYTEA,
  is_confidential BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- MODULE 4: PROCTOR ALLOCATION & REASSIGNMENT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proctor_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_capacity INT DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proctor_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  proctor_group_id UUID REFERENCES proctor_groups(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRANSFERRED', 'COMPLETED')),
  allocated_date DATE DEFAULT CURRENT_DATE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  allocated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proctor_reassignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  previous_faculty_id UUID NOT NULL REFERENCES faculty(id),
  new_faculty_id UUID NOT NULL REFERENCES faculty(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  reassignment_date DATE DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- MODULE 5: MENTORING & MEETING MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mentoring_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  meeting_type VARCHAR(50) DEFAULT 'INDIVIDUAL' CHECK (meeting_type IN ('INDIVIDUAL', 'GROUP')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  venue VARCHAR(255) DEFAULT 'Proctor Cabin / Online',
  status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED')),
  general_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES mentoring_meetings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_status VARCHAR(20) DEFAULT 'PENDING' CHECK (attendance_status IN ('PRESENT', 'ABSENT', 'EXCUSED', 'PENDING')),
  discussion_notes TEXT,
  identified_challenges TEXT,
  student_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_meeting_participant UNIQUE (meeting_id, student_id)
);

-- ----------------------------------------------------------------------------
-- MODULE 6: ACADEMIC PERFORMANCE & ATTENDANCE (VTU/IA RULES)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS academic_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  name VARCHAR(100) NOT NULL, -- 'Odd Semester 2024-25'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- e.g. '21CS51'
  name VARCHAR(255) NOT NULL, -- 'Management and Entrepreneurship'
  semester_number INT NOT NULL,
  credits INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_subject_code UNIQUE (institution_id, programme_id, code)
);

CREATE TABLE IF NOT EXISTS mark_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  ia1_marks NUMERIC(5,2), -- Internal Assessment 1 (out of 50 or 25)
  ia2_marks NUMERIC(5,2), -- Internal Assessment 2 (out of 50 or 25)
  avg_ia_marks NUMERIC(5,2), -- Calculated Average IA Marks out of 50
  vtu_external_marks NUMERIC(5,2), -- VTU Semester End Exam Marks (out of 50/100)
  total_marks NUMERIC(5,2),
  grade VARCHAR(10), -- 'S', 'A', 'B', 'C', 'D', 'E', 'F'
  is_backlog BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_student_subject_mark UNIQUE (student_id, subject_id, semester_number)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  classes_held INT NOT NULL DEFAULT 0,
  classes_attended INT NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN classes_held > 0 THEN ROUND((classes_attended::NUMERIC / classes_held::NUMERIC) * 100, 2) ELSE 0 END
  ) STORED,
  is_shortage BOOLEAN DEFAULT false, -- True if percentage < 75% or 85%
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_student_subject_att UNIQUE (student_id, subject_id, semester_number)
);

CREATE TABLE IF NOT EXISTS result_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  sgpa NUMERIC(4,2),
  cgpa NUMERIC(4,2),
  active_backlogs INT DEFAULT 0,
  academic_standing VARCHAR(50) DEFAULT 'GOOD', -- 'GOOD', 'PROBATION', 'CRITICAL'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_student_semester_summary UNIQUE (student_id, semester_number)
);

-- ----------------------------------------------------------------------------
-- MODULE 7: STUDENT RISK & INTERVENTION MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES users(id),
  category VARCHAR(50) NOT NULL, -- 'ACADEMIC', 'ATTENDANCE', 'BEHAVIORAL', 'HEALTH', 'FINANCIAL'
  severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES student_issues(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  objective TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  target_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_plan_id UUID NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  conducted_by UUID NOT NULL REFERENCES users(id),
  follow_up_date DATE DEFAULT CURRENT_DATE,
  progress_notes TEXT NOT NULL,
  outcome VARCHAR(50) DEFAULT 'ON_TRACK', -- 'ON_TRACK', 'NEEDS_ESCALATION', 'RESOLVED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- MODULE 8: COUNSELLING & CONFIDENTIAL RECORDS (STRICT ZERO-LEAK ACL)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS counselling_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  counsellor_id UUID NOT NULL REFERENCES users(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  session_number INT DEFAULT 1,
  general_status VARCHAR(50) DEFAULT 'ONGOING', -- 'ONGOING', 'COMPLETED', 'REFERRED'
  referral_source VARCHAR(100), -- 'Self', 'Proctor', 'HOD'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confidential_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES counselling_sessions(id) ON DELETE CASCADE,
  encrypted_note TEXT NOT NULL, -- Field-level encrypted confidential clinical notes
  risk_level VARCHAR(20) DEFAULT 'NORMAL', -- 'NORMAL', 'MODERATE', 'SEVERE_CRISIS'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselling_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES counselling_sessions(id) ON DELETE CASCADE,
  accessed_by UUID NOT NULL REFERENCES users(id),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- ----------------------------------------------------------------------------
-- MODULE 9: STUDENT DEVELOPMENT & CAREER READINESS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  target_date DATE,
  status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'DEFERRED')),
  progress_percentage INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'TECHNICAL', -- 'TECHNICAL', 'SOFT_SKILL', 'LANGUAGE'
  CONSTRAINT uq_skill_inst UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS student_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency VARCHAR(20) DEFAULT 'INTERMEDIATE' CHECK (proficiency IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
  CONSTRAINT uq_student_skill UNIQUE (student_id, skill_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  issuing_org VARCHAR(255) NOT NULL, -- e.g. 'NPTEL', 'Coursera', 'AWS'
  issue_date DATE,
  certificate_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  stipend_amount NUMERIC(10,2),
  status VARCHAR(20) DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- MODULE 10: COMMUNICATION & NOTIFICATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parent_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id),
  channel VARCHAR(20) DEFAULT 'SMS' CHECK (channel IN ('SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'CALL')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'SENT' CHECK (delivery_status IN ('SENT', 'DELIVERED', 'FAILED', 'READ'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'INFO', -- 'INFO', 'WARNING', 'ALERT', 'MEETING'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- MODULE 11: BULK IMPORTS, REPORTS & EXPORTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES users(id),
  import_type VARCHAR(50) NOT NULL, -- 'STUDENT_LIST', 'IA_MARKS', 'ATTENDANCE', 'VTU_RESULTS'
  file_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'VALIDATED', 'COMPLETED', 'FAILED')),
  total_rows INT DEFAULT 0,
  successful_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_row_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_data JSONB NOT NULL,
  error_message TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- MODULE 12: IN-DATABASE FILE & OBJECT STORAGE (LOCAL DATABASE STORAGE)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stored_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_data BYTEA NOT NULL,
  category VARCHAR(50) DEFAULT 'GENERAL', -- 'STUDENT_DOC', 'CERTIFICATE', 'IMPORT', 'GENERAL'
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance & multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_users_inst ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_inst ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_usn ON students(usn);
CREATE INDEX IF NOT EXISTS idx_allocations_student ON proctor_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_allocations_faculty ON proctor_allocations(faculty_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON mark_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_inst ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_stored_files_inst ON stored_files(institution_id);
CREATE INDEX IF NOT EXISTS idx_stored_files_cat ON stored_files(category);
