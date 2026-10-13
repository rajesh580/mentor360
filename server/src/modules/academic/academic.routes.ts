import { Router, Request, Response } from 'express';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/academic/subjects
router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;
    const { semester, programmeId } = req.query;

    let sql = `SELECT * FROM subjects WHERE institution_id = $1`;
    const params: any[] = [institutionId];

    if (semester) {
      params.push(Number(semester));
      sql += ` AND semester_number = $${params.length}`;
    }

    if (programmeId) {
      params.push(programmeId);
      sql += ` AND programme_id = $${params.length}`;
    }

    sql += ` ORDER BY code ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
});

// POST /api/academic/marks - Save or update student IA/VTU marks
router.post('/marks', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR']), async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, semesterNumber, ia1Marks, ia2Marks, vtuExternalMarks } = req.body;
    const institutionId = req.tenantId;
    const userId = req.user!.id;

    if (!studentId || !subjectId || !semesterNumber) {
      return res.status(400).json({ error: 'studentId, subjectId, and semesterNumber are required.' });
    }

    // Calculate Average IA marks out of 50
    let avgIa: number | null = null;
    if (ia1Marks !== undefined && ia1Marks !== null && ia2Marks !== undefined && ia2Marks !== null) {
      // SVIT / VTU rule: Average of both IAs (e.g., (IA1 + IA2) / 2)
      avgIa = Number(((Number(ia1Marks) + Number(ia2Marks)) / 2).toFixed(2));
    } else if (ia1Marks !== undefined && ia1Marks !== null) {
      avgIa = Number(ia1Marks);
    }

    let totalMarks: number | null = null;
    if (avgIa !== null && vtuExternalMarks !== undefined && vtuExternalMarks !== null) {
      totalMarks = Number((avgIa + (Number(vtuExternalMarks) / 2)).toFixed(2));
    }

    const result = await query(
      `INSERT INTO mark_records (
         institution_id, student_id, subject_id, semester_number,
         ia1_marks, ia2_marks, avg_ia_marks, vtu_external_marks, total_marks, verified_by, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (student_id, subject_id, semester_number)
       DO UPDATE SET
         ia1_marks = COALESCE(EXCLUDED.ia1_marks, mark_records.ia1_marks),
         ia2_marks = COALESCE(EXCLUDED.ia2_marks, mark_records.ia2_marks),
         avg_ia_marks = EXCLUDED.avg_ia_marks,
         vtu_external_marks = COALESCE(EXCLUDED.vtu_external_marks, mark_records.vtu_external_marks),
         total_marks = EXCLUDED.total_marks,
         verified_by = EXCLUDED.verified_by,
         updated_at = NOW()
       RETURNING *`,
      [institutionId, studentId, subjectId, semesterNumber, ia1Marks, ia2Marks, avgIa, vtuExternalMarks, totalMarks, userId]
    );

    res.json({ message: 'Marks updated successfully', record: result.rows[0] });
  } catch (err) {
    console.error('Failed to update marks:', err);
    res.status(500).json({ error: 'Failed to record academic marks.' });
  }
});

// POST /api/academic/attendance - Save or update attendance
router.post('/attendance', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR']), async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, semesterNumber, classesHeld, classesAttended } = req.body;
    const institutionId = req.tenantId;

    if (!studentId || !subjectId || !semesterNumber || classesHeld === undefined || classesAttended === undefined) {
      return res.status(400).json({ error: 'Missing mandatory attendance parameters.' });
    }

    const percentage = classesHeld > 0 ? (classesAttended / classesHeld) * 100 : 0;
    const isShortage = percentage < 75.0; // VTU 75% shortage threshold

    const result = await query(
      `INSERT INTO attendance_records (
         institution_id, student_id, subject_id, semester_number, classes_held, classes_attended, is_shortage, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (student_id, subject_id, semester_number)
       DO UPDATE SET
         classes_held = EXCLUDED.classes_held,
         classes_attended = EXCLUDED.classes_attended,
         is_shortage = EXCLUDED.is_shortage,
         updated_at = NOW()
       RETURNING *`,
      [institutionId, studentId, subjectId, semesterNumber, classesHeld, classesAttended, isShortage]
    );

    res.json({ message: 'Attendance updated successfully', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record attendance.' });
  }
});

export default router;
