import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import {
  saveFileToDatabase,
  getFileFromDatabase,
  listFilesFromDatabase,
  deleteFileFromDatabase,
} from '../../services/storage.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

// GET /api/files/:id - Stream/view stored file by ID (Public with proper file headers or authenticated)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const file = await getFileFromDatabase(id);

    if (!file) {
      return res.status(404).json({ error: 'Requested file not found in database.' });
    }

    res.set({
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Length': file.file_size,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.original_name)}"`,
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(file.file_data);
  } catch (err) {
    console.error('Error serving file from database:', err);
    return res.status(500).json({ error: 'Failed to retrieve file from database.' });
  }
});

// GET /api/files/:id/download - Force attachment download
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const file = await getFileFromDatabase(id);

    if (!file) {
      return res.status(404).json({ error: 'Requested file not found in database.' });
    }

    res.set({
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Length': file.file_size,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.original_name)}"`,
    });

    return res.send(file.file_data);
  } catch (err) {
    console.error('Error downloading file from database:', err);
    return res.status(500).json({ error: 'Failed to download file from database.' });
  }
});

// Authenticated tenant routes below
router.use(authenticate, tenantMiddleware);

// POST /api/files/upload - Upload file directly into PostgreSQL database (BYTEA)
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided in multipart form data.' });
    }

    const institutionId = req.tenantId!;
    const userId = req.user?.id || null;
    const { category } = req.body;

    const storedFile = await saveFileToDatabase({
      institutionId,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      buffer: req.file.buffer,
      category: category || 'GENERAL',
      uploadedBy: userId,
    });

    return res.status(201).json({
      message: 'File successfully stored into database.',
      file: storedFile,
    });
  } catch (err) {
    console.error('Error uploading file to database:', err);
    return res.status(500).json({ error: 'Failed to store file in database.' });
  }
});

// GET /api/files - List stored files for current tenant
router.get('/', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId!;
    const { category } = req.query;

    const files = await listFilesFromDatabase(institutionId, category as string | undefined);
    return res.json(files);
  } catch (err) {
    console.error('Error listing files from database:', err);
    return res.status(500).json({ error: 'Failed to list stored files.' });
  }
});

// DELETE /api/files/:id - Delete file from database
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const institutionId = req.tenantId!;

    const deleted = await deleteFileFromDatabase(id, institutionId);
    if (!deleted) {
      return res.status(404).json({ error: 'File not found or unauthorized.' });
    }

    return res.json({ message: 'File successfully removed from database.' });
  } catch (err) {
    console.error('Error deleting file from database:', err);
    return res.status(500).json({ error: 'Failed to delete file from database.' });
  }
});

export default router;
