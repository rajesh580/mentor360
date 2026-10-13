import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/meetings - List meetings for faculty or current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;
    const { facultyId } = req.query;

    let sql = `
      SELECT mm.*, u.full_name as mentor_name,
             COUNT(mp.id) as total_students,
             COUNT(mp.id) FILTER (WHERE mp.attendance_status = 'PRESENT') as present_count
      FROM mentoring_meetings mm
      JOIN faculty f ON mm.faculty_id = f.id
      JOIN users u ON f.user_id = u.id
      LEFT JOIN meeting_participants mp ON mm.id = mp.meeting_id
      WHERE mm.institution_id = $1
    `;
    const params: any[] = [institutionId];

    if (facultyId) {
      params.push(facultyId);
      sql += ` AND mm.faculty_id = $${params.length}`;
    }

    sql += ` GROUP BY mm.id, u.full_name ORDER BY mm.scheduled_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to get meetings:', err);
    res.status(500).json({ error: 'Failed to retrieve mentoring meetings.' });
  }
});

// POST /api/meetings - Schedule new mentoring meeting
router.post('/', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR']), async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { facultyId, title, meetingType, scheduledAt, venue, generalRemarks, studentIds } = req.body;
    const institutionId = req.tenantId;

    if (!facultyId || !title || !scheduledAt || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'facultyId, title, scheduledAt, and studentIds array are required.' });
    }

    await client.query('BEGIN');

    const meetingRes = await client.query(
      `INSERT INTO mentoring_meetings (
         institution_id, faculty_id, title, meeting_type, scheduled_at, venue, status, general_remarks
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7)
       RETURNING id`,
      [institutionId, facultyId, title, meetingType || 'INDIVIDUAL', scheduledAt, venue || 'Proctor Cabin', generalRemarks || '']
    );

    const meetingId = meetingRes.rows[0].id;

    for (const stuId of studentIds) {
      await client.query(
        `INSERT INTO meeting_participants (meeting_id, student_id, attendance_status)
         VALUES ($1, $2, 'PENDING')`,
        [meetingId, stuId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Meeting scheduled successfully', meetingId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to schedule meeting:', err);
    res.status(500).json({ error: 'Failed to schedule meeting.' });
  } finally {
    client.release();
  }
});

// PUT /api/meetings/:id/notes - Update participant discussion notes and attendance
router.put('/:id/notes', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, attendanceStatus, discussionNotes, identifiedChallenges, studentFeedback } = req.body;

    await query(
      `UPDATE meeting_participants
       SET attendance_status = COALESCE($1, attendance_status),
           discussion_notes = COALESCE($2, discussion_notes),
           identified_challenges = COALESCE($3, identified_challenges),
           student_feedback = COALESCE($4, studentFeedback)
       WHERE meeting_id = $5 AND student_id = $6`,
      [attendanceStatus, discussionNotes, identifiedChallenges, studentFeedback, id, studentId]
    );

    res.json({ message: 'Participant notes updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meeting notes.' });
  }
});

export default router;
