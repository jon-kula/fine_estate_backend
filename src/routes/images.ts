import { Router } from 'express';
import { SupabaseImageService } from '../services/SupabaseImageService';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { UserRole } from '../entities/User';
import { AppDataSource } from '../config/database';
import { Image, ImageStatus } from '../entities/Image';
import { z } from 'zod';

const router = Router();
const imageService = new SupabaseImageService();
const imageRepository = AppDataSource.getRepository(Image);

// Validation schemas
const uploadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pageLocation: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pageLocation: z.string().optional(),
  status: z.enum([ImageStatus.ACTIVE, ImageStatus.ARCHIVED]).optional(),
});

// Routes
router.post('/upload', authenticate, authorize(UserRole.ADMIN, UserRole.EDITOR), upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = uploadSchema.parse(req.body);
    const image = await imageService.uploadImage({
      file: req.file,
      ...data,
      userId: req.user.userId,
    } as any);

    res.json(image);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { pageLocation, category, status } = req.query;
    
    const query: any = {};
    if (pageLocation) query.pageLocation = pageLocation;
    if (category) query.category = category;
    if (status) query.status = status;

    const images = await imageRepository.find({
      where: query,
      relations: ['variants', 'uploadedBy'],
      order: { createdAt: 'DESC' },
    });

    res.json(images);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const image = await imageRepository.findOne({
      where: { id: req.params.id },
      relations: ['variants', 'uploadedBy'],
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.EDITOR), async (req, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const image = await imageRepository.findOne({
      where: { id: req.params.id },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    Object.assign(image, data);
    await imageRepository.save(image);

    res.json(image);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    await imageService.deleteImage(req.params.id);
    res.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/location/:pageLocation', async (req, res) => {
  try {
    const images = await imageService.getImagesByLocation(req.params.pageLocation);
    res.json(images);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;