import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: any, cb: multer.FileFilterCallback) => {
  const allowedFormats = process.env.ALLOWED_IMAGE_FORMATS?.split(',') || ['jpeg', 'jpg', 'png', 'webp', 'gif'];
  const fileExt = file.originalname.split('.').pop()?.toLowerCase();
  
  if (fileExt && allowedFormats.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File format not allowed. Allowed formats: ${allowedFormats.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'), // 10MB default
  },
});