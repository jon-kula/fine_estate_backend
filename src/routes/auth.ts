import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../entities/User';
import { z } from 'zod';

const router = Router();
const authService = new AuthService();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]).optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

// Routes
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data as any);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data as any);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/reset-password-request', async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    await authService.resetPasswordRequest(data.email);
    res.json({ message: 'Reset password email sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/change-password', authenticate, async (req: any, res) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.userId, data.currentPassword, data.newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;