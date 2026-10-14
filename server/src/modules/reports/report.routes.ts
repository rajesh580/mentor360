import { Router, Request, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { saveFileToDatabase } from '../../services/storage.service.js';
import { cacheMiddleware } from '../../services/cache.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate, tenantMiddleware);

// GET /api/reports/dashboard-stats - High-level metrics for Admin/Proctors with cache
router.get('/dashboard-stats', cacheMiddleware(30, ['reports']), async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const [studentsCount, facultyCount, shortagesCount, issuesCount, meetingsCount, allocatedCount] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM students WHERE institution_id = $1`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM faculty WHERE institution_id = $1`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM attendance_records WHERE institution_id = $1 AND is_shortage = true`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM student_issues WHERE institution_id = $1 AND status = 'OPEN'`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM mentoring_meetings WHERE institution_id = $1 AND status = 'COMPLETED'`, [institutionId]),
      query(`SELECT COUNT(DISTINCT student_id) as count FROM proctor_allocations WHERE institution_id = $1 AND status = 'ACTIVE'`, [institutionId]),
    ]);

    const totalStudents = parseInt(studentsCount.rows[0].count);
    const allocated = parseInt(allocatedCount.rows[0].count);
    const coveragePercent = totalStudents > 0 ? Math.round((allocated / totalStudents) * 100) : 0;

    res.json({
      totalStudents,
      totalFaculty: parseInt(facultyCount.rows[0].count),
      attendanceShortages: parseInt(shortagesCount.rows[0].count),
      openConcerns: parseInt(issuesCount.rows[0].count),
      completedMeetings: parseInt(meetingsCount.rows[0].count),
      allocatedStudents: allocated,
      coveragePercent,
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard analytics.' });
  }
});

// GET /api/reports/institutional-analytics - Deep departmental breakdown and accreditation telemetry
router.get('/institutional-analytics', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    // 1. Department Breakdown
    const deptSql = `
      SELECT d.id, d.code, d.name,
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT f.id) as faculty_count,
             COUNT(DISTINCT CASE WHEN ar.is_shortage = true THEN s.id END) as shortage_count,
             COUNT(DISTINCT CASE WHEN si.status = 'OPEN' THEN si.id END) as open_issues_count,
             ROUND(AVG(rs.sgpa)::numeric, 2) as avg_sgpa
      FROM departments d
      LEFT JOIN students s ON d.id = s.department_id AND s.institution_id = $1
      LEFT JOIN faculty f ON d.id = f.department_id AND f.institution_id = $1
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.is_shortage = true
      LEFT JOIN student_issues si ON s.id = si.student_id AND si.status = 'OPEN'
      LEFT JOIN result_summaries rs ON s.id = rs.student_id
      WHERE d.institution_id = $1
      GROUP BY d.id, d.code, d.name
      ORDER BY d.code ASC
    `;

    // 2. Issues Breakdown by Category
    const issuesSql = `
      SELECT category, severity, COUNT(*) as count
      FROM student_issues
      WHERE institution_id = $1
      GROUP BY category, severity
      ORDER BY count DESC
    `;

    // 3. Mentoring meeting status breakdown
    const meetingStatsSql = `
      SELECT status, meeting_type, COUNT(*) as count
      FROM mentoring_meetings
      WHERE institution_id = $1
      GROUP BY status, meeting_type
    `;

    // 4. Semester-wise distribution
    const semSql = `
      SELECT current_semester, COUNT(*) as student_count
      FROM students
      WHERE institution_id = $1
      GROUP BY current_semester
      ORDER BY current_semester ASC
    `;

    const [deptRes, issuesRes, meetingsRes, semRes] = await Promise.all([
      query(deptSql, [institutionId]),
      query(issuesSql, [institutionId]),
      query(meetingStatsSql, [institutionId]),
      query(semSql, [institutionId]),
    ]);

    res.json({
      departmentBreakdown: deptRes.rows,
      issuesBreakdown: issuesRes.rows,
      meetingStats: meetingsRes.rows,
      semesterDistribution: semRes.rows,
    });
  } catch (err) {
    console.error('Error fetching institutional analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve institutional analytics.' });
  }
});

// GET /api/reports/export-accreditation - Accreditation-ready proctoring report data
router.get('/export-accreditation', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const sql = `
      SELECT s.usn, s.full_name as student_name, s.current_semester, s.current_section,
             d.code as department,
             u_f.full_name as mentor_name, f.designation as mentor_designation,
             pa.allocated_date,
             COALESCE(att.shortage_flag, false) as has_attendance_shortage,
             COALESCE(issues.open_issues_count, 0) as active_concerns,
             COALESCE(meet.meetings_attended, 0) as mentoring_meetings_attended
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN proctor_allocations pa ON s.id = pa.student_id AND pa.status = 'ACTIVE'
      LEFT JOIN faculty f ON pa.faculty_id = f.id
      LEFT JOIN users u_f ON f.user_id = u_f.id
      LEFT JOIN (
        SELECT student_id, bool_or(is_shortage) as shortage_flag
        FROM attendance_records
        GROUP BY student_id
      ) att ON s.id = att.student_id
      LEFT JOIN (
        SELECT student_id, COUNT(*) as open_issues_count
        FROM student_issues
        WHERE status = 'OPEN'
        GROUP BY student_id
      ) issues ON s.id = issues.student_id
      LEFT JOIN (
        SELECT student_id, COUNT(*) as meetings_attended
        FROM meeting_participants
        WHERE attendance_status = 'PRESENT'
        GROUP BY student_id
      ) meet ON s.id = meet.student_id
      WHERE s.institution_id = $1
      ORDER BY d.code, s.current_semester, s.usn
    `;

    const result = await query(sql, [institutionId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error exporting accreditation summary:', err);
    res.status(500).json({ error: 'Failed to generate accreditation export.' });
  }
});

// GET /api/reports/iqac-metrics - Accreditation (NAAC Criterion 2 / NBA Criterion 9) Analytics
router.get('/iqac-metrics', cacheMiddleware(30, ['reports']), async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const [studentsRes, facultyRes, allocRes, meetingsRes, marksRes, remedialRes] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM students WHERE institution_id = $1`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM faculty WHERE institution_id = $1`, [institutionId]),
      query(`SELECT COUNT(DISTINCT student_id) as count FROM proctor_allocations WHERE institution_id = $1 AND status = 'ACTIVE'`, [institutionId]),
      query(`SELECT COUNT(*) as total_meetings, COUNT(DISTINCT student_id) as students_mentored FROM meeting_participants mp JOIN mentoring_meetings mm ON mp.meeting_id = mm.id WHERE mm.institution_id = $1 AND mp.attendance_status = 'PRESENT'`, [institutionId]),
      query(
        `SELECT s.id, s.usn, s.full_name, s.current_semester, d.code as department_code,
                ROUND(AVG(mr.avg_ia_marks)::numeric, 2) as overall_avg_ia
         FROM students s
         JOIN departments d ON s.department_id = d.id
         JOIN mark_records mr ON s.id = mr.student_id
         WHERE s.institution_id = $1
         GROUP BY s.id, s.usn, s.full_name, s.current_semester, d.code`,
        [institutionId]
      ),
      query(
        `SELECT ap.*, si.title as issue_title, si.category, s.usn, s.full_name as student_name
         FROM action_plans ap
         JOIN student_issues si ON ap.issue_id = si.id
         JOIN students s ON si.student_id = s.id
         WHERE si.institution_id = $1 AND ap.status IN ('PENDING', 'IN_PROGRESS')`,
        [institutionId]
      ),
    ]);

    const totalStudents = parseInt(studentsRes.rows[0].count) || 0;
    const totalFaculty = parseInt(facultyRes.rows[0].count) || 0;
    const allocatedStudents = parseInt(allocRes.rows[0].count) || 0;
    const ratio = totalFaculty > 0 ? Number((totalStudents / totalFaculty).toFixed(1)) : 0;
    const coveragePercent = totalStudents > 0 ? Math.round((allocatedStudents / totalStudents) * 100) : 0;

    // Slow Learners: Overall Avg IA < 25 (out of 50)
    const slowLearners = marksRes.rows.filter((m: any) => Number(m.overall_avg_ia) < 25.0);
    // Advanced Learners: Overall Avg IA >= 40 (out of 50)
    const advancedLearners = marksRes.rows.filter((m: any) => Number(m.overall_avg_ia) >= 40.0);

    res.json({
      ratio,
      ratioFormatted: `1:${ratio}`,
      ratioCompliant: ratio <= 20, // NAAC / NBA 1:20 guideline
      totalStudents,
      totalFaculty,
      allocatedStudents,
      coveragePercent,
      meetingsConducted: parseInt(meetingsRes.rows[0].total_meetings) || 0,
      studentsMentoredCount: parseInt(meetingsRes.rows[0].students_mentored) || 0,
      slowLearnersCount: slowLearners.length,
      slowLearners,
      advancedLearnersCount: advancedLearners.length,
      advancedLearners,
      activeRemedialPlans: remedialRes.rows,
    });
  } catch (err) {
    console.error('Failed to get IQAC metrics:', err);
    res.status(500).json({ error: 'Failed to retrieve IQAC accreditation metrics.' });
  }
});

// GET /api/reports/leadership-summary - Executive Dashboard for Principal, Dean & HODs
router.get('/leadership-summary', cacheMiddleware(30, ['reports']), async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const [statsRes, deptRes] = await Promise.all([
      query(
        `SELECT
           (SELECT COUNT(*) FROM students WHERE institution_id = $1) as total_students,
           (SELECT COUNT(*) FROM faculty WHERE institution_id = $1) as total_faculty,
           (SELECT COUNT(*) FROM attendance_records WHERE institution_id = $1 AND is_shortage = true) as shortage_count,
           (SELECT COUNT(*) FROM student_issues WHERE institution_id = $1 AND status = 'OPEN') as open_issues,
           (SELECT COUNT(*) FROM mentoring_meetings WHERE institution_id = $1 AND status = 'COMPLETED') as completed_meetings,
           (SELECT COUNT(DISTINCT student_id) FROM proctor_allocations WHERE institution_id = $1 AND status = 'ACTIVE') as allocated_students`,
        [institutionId]
      ),
      query(
        `SELECT d.id, d.code, d.name,
                COUNT(DISTINCT s.id) as student_count,
                COUNT(DISTINCT f.id) as faculty_count,
                ROUND(AVG(rs.sgpa)::numeric, 2) as avg_sgpa,
                COUNT(DISTINCT CASE WHEN ar.is_shortage = true THEN s.id END) as shortage_students,
                COUNT(DISTINCT CASE WHEN si.status = 'OPEN' THEN si.id END) as open_concerns,
                COUNT(DISTINCT mm.id) as meetings_count
         FROM departments d
         LEFT JOIN students s ON d.id = s.department_id AND s.institution_id = $1
         LEFT JOIN faculty f ON d.id = f.department_id AND f.institution_id = $1
         LEFT JOIN result_summaries rs ON s.id = rs.student_id
         LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.is_shortage = true
         LEFT JOIN student_issues si ON s.id = si.student_id AND si.status = 'OPEN'
         LEFT JOIN mentoring_meetings mm ON f.id = mm.faculty_id AND mm.status = 'COMPLETED'
         WHERE d.institution_id = $1
         GROUP BY d.id, d.code, d.name
         ORDER BY d.code ASC`,
        [institutionId]
      ),
    ]);

    const s = statsRes.rows[0];
    const totalStudents = parseInt(s.total_students) || 0;
    const allocated = parseInt(s.allocated_students) || 0;

    res.json({
      overview: {
        totalStudents,
        totalFaculty: parseInt(s.total_faculty) || 0,
        coveragePercent: totalStudents > 0 ? Math.round((allocated / totalStudents) * 100) : 0,
        shortageCount: parseInt(s.shortage_count) || 0,
        openIssues: parseInt(s.open_issues) || 0,
        completedMeetings: parseInt(s.completed_meetings) || 0,
      },
      departments: deptRes.rows,
    });
  } catch (err) {
    console.error('Failed to get leadership summary:', err);
    res.status(500).json({ error: 'Failed to retrieve leadership summary.' });
  }
});

// POST /api/reports/import-preview - Store Excel in database and run validation preview
router.post('/import-preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file provided.' });
    }

    const institutionId = req.tenantId!;

    // 1. Store uploaded file directly into PostgreSQL database (BYTEA)
    const storedFile = await saveFileToDatabase({
      institutionId,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: req.file.size,
      buffer: req.file.buffer,
      category: 'IMPORT',
      uploadedBy: req.user?.id || null,
    });

    // 2. Parse workbook from memory buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ error: 'Uploaded workbook is empty.' });
    }

    const validRows: any[] = [];
    const errorRows: any[] = [];

    // Row 1 is Header: USN, SubjectCode, Semester, IA1, IA2, VTU_External, ClassesHeld, ClassesAttended
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const usn = row.getCell(1).text?.trim();
      const subjectCode = row.getCell(2).text?.trim();
      const semester = parseInt(row.getCell(3).text?.trim());
      const ia1Raw = row.getCell(4).value;
      const ia2Raw = row.getCell(5).value;
      const vtuRaw = row.getCell(6).value;

      if (!usn || !subjectCode || isNaN(semester)) {
        errorRows.push({
          rowNumber,
          error: 'Missing required columns (USN, SubjectCode, or Semester).',
        });
        return;
      }

      const ia1 = ia1Raw !== null && ia1Raw !== undefined && ia1Raw !== '' ? Number(ia1Raw) : null;
      const ia2 = ia2Raw !== null && ia2Raw !== undefined && ia2Raw !== '' ? Number(ia2Raw) : null;
      const vtu = vtuRaw !== null && vtuRaw !== undefined && vtuRaw !== '' ? Number(vtuRaw) : null;

      if (ia1 !== null && (isNaN(ia1) || ia1 < 0 || ia1 > 50)) {
        errorRows.push({ rowNumber, usn, error: 'IA1 marks must be between 0 and 50.' });
        return;
      }

      if (ia2 !== null && (isNaN(ia2) || ia2 < 0 || ia2 > 50)) {
        errorRows.push({ rowNumber, usn, error: 'IA2 marks must be between 0 and 50.' });
        return;
      }

      validRows.push({
        rowNumber,
        usn,
        subjectCode,
        semester,
        ia1,
        ia2,
        vtu,
      });
    });

    // 3. Record import job in database
    const jobRes = await query(
      `INSERT INTO import_jobs (
         institution_id, imported_by, import_type, file_name, status, total_rows, successful_rows, failed_rows
       )
       VALUES ($1, $2, 'IA_MARKS', $3, 'VALIDATED', $4, $5, $6)
       RETURNING id`,
      [
        institutionId,
        req.user!.id,
        req.file.originalname,
        validRows.length + errorRows.length,
        validRows.length,
        errorRows.length,
      ]
    );

    res.json({
      message: 'Workbook saved to database and validated.',
      file: storedFile,
      jobId: jobRes.rows[0]?.id,
      totalRows: validRows.length + errorRows.length,
      validCount: validRows.length,
      errorCount: errorRows.length,
      validPreview: validRows.slice(0, 10),
      errors: errorRows,
    });
  } catch (err) {
    console.error('Failed to parse Excel file:', err);
    res.status(500).json({ error: 'Failed to process Excel workbook.' });
  }
});

export default router;
