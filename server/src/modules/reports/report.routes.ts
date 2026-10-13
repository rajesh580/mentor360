import { Router, Request, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { saveFileToDatabase } from '../../services/storage.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate, tenantMiddleware);

// GET /api/reports/dashboard-stats - High-level metrics for Admin/Proctors
router.get('/dashboard-stats', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const [studentsCount, facultyCount, shortagesCount, issuesCount, meetingsCount] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM students WHERE institution_id = $1`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM faculty WHERE institution_id = $1`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM attendance_records WHERE institution_id = $1 AND is_shortage = true`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM student_issues WHERE institution_id = $1 AND status = 'OPEN'`, [institutionId]),
      query(`SELECT COUNT(*) as count FROM mentoring_meetings WHERE institution_id = $1 AND status = 'COMPLETED'`, [institutionId]),
    ]);

    res.json({
      totalStudents: parseInt(studentsCount.rows[0].count),
      totalFaculty: parseInt(facultyCount.rows[0].count),
      attendanceShortages: parseInt(shortagesCount.rows[0].count),
      openConcerns: parseInt(issuesCount.rows[0].count),
      completedMeetings: parseInt(meetingsCount.rows[0].count),
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard analytics.' });
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
