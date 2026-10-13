import { query } from '../config/db.js';

export interface SaveFileInput {
  institutionId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
  category?: string;
  uploadedBy?: string | null;
}

export interface StoredFileRecord {
  id: string;
  institution_id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  category: string;
  uploaded_by?: string | null;
  created_at: string;
  file_url: string;
}

/**
 * Saves a file's binary content directly into the PostgreSQL database (BYTEA column).
 */
export const saveFileToDatabase = async (input: SaveFileInput): Promise<StoredFileRecord> => {
  const {
    institutionId,
    fileName,
    originalName,
    mimeType,
    fileSize,
    buffer,
    category = 'GENERAL',
    uploadedBy = null,
  } = input;

  const result = await query(
    `INSERT INTO stored_files (
       institution_id, file_name, original_name, mime_type, file_size, file_data, category, uploaded_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, institution_id, file_name, original_name, mime_type, file_size, category, uploaded_by, created_at`,
    [institutionId, fileName, originalName, mimeType, fileSize, buffer, category, uploadedBy]
  );

  const row = result.rows[0];
  return {
    ...row,
    file_url: `/api/files/${row.id}`,
  };
};

/**
 * Retrieves a file's binary content and metadata from the database by ID.
 */
export const getFileFromDatabase = async (id: string, institutionId?: string) => {
  let sql = `SELECT id, institution_id, file_name, original_name, mime_type, file_size, file_data, category, uploaded_by, created_at
             FROM stored_files WHERE id = $1`;
  const params: any[] = [id];

  if (institutionId) {
    params.push(institutionId);
    sql += ` AND institution_id = $2`;
  }

  const result = await query(sql, params);
  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Lists stored files metadata for a specific institution/tenant.
 */
export const listFilesFromDatabase = async (institutionId: string, category?: string): Promise<StoredFileRecord[]> => {
  let sql = `SELECT id, institution_id, file_name, original_name, mime_type, file_size, category, uploaded_by, created_at
             FROM stored_files WHERE institution_id = $1`;
  const params: any[] = [institutionId];

  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  sql += ` ORDER BY created_at DESC`;
  const result = await query(sql, params);

  return result.rows.map((r) => ({
    ...r,
    file_url: `/api/files/${r.id}`,
  }));
};

/**
 * Deletes a file record and its binary data from the database.
 */
export const deleteFileFromDatabase = async (id: string, institutionId: string): Promise<boolean> => {
  const result = await query(
    `DELETE FROM stored_files WHERE id = $1 AND institution_id = $2 RETURNING id`,
    [id, institutionId]
  );
  return result.rows.length > 0;
};
