import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { authenticate, authorize } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum([UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]).optional(),
  isActive: z.boolean().optional(),
});

// Routes
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const users = await userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLogin', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const user = await userRepository.findOne({
      where: { id: req.params.id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = userRepository.create({
      ...data,
      password: hashedPassword,
    });

    await userRepository.save(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    Object.assign(user, data);
    await userRepository.save(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (user.id === (req as any).user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await userRepository.remove(user);

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Password reset for specific user (admin only)
router.post('/:id/reset-password', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    await userRepository.save(user);

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;