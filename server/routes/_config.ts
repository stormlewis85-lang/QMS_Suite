import multer from "multer";
import { rateLimit } from "../middleware/rate-limit";

// Configure multer for file uploads (Excel import)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

// Document file upload config (allows all common document types)
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for documents
});

// Rate limiting for auth endpoints
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many authentication attempts, please try again later' });
export const registerRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5, message: 'Too many registration attempts, please try again later' });
