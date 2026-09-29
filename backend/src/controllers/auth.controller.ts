import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Please provide email and password' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      const secret = process.env.JWT_SECRET || 'super_secret_live_coding_assessment_key_2026_!@#';
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        secret,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          department: user.department,
          section: user.section,
          year: user.year
        }
      });
    } catch (error: any) {
      console.error('[AuthController.login] Error:', error);
      res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        studentId: req.user.studentId,
        department: req.user.department,
        section: req.user.section,
        year: req.user.year
      }
    });
  }

  static async getDemoAccounts(_req: Request, res: Response): Promise<void> {
    try {
      // Safe, idempotent pipeline: add 'cse' before @sece.ac.in for all students (passwords unchanged)
      await User.updateMany(
        {
          role: 'student',
          email: {
            $regex: /@sece\.ac\.in$/i,
            $not: /cse@sece\.ac\.in$/i
          }
        },
        [
          {
            $set: {
              email: {
                $replaceOne: {
                  input: '$email',
                  find: '@sece.ac.in',
                  replacement: 'cse@sece.ac.in'
                }
              }
            }
          }
        ]
      );

      const users = await User.find({}).select('email name role studentId department section');
      res.status(200).json({
        success: true,
        accounts: users
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current password and new password are required.' });
        return;
      }

      // 1. Fetch user with passwordHash
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      // 2. Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        return;
      }

      // 3. Ensure new password is different from current password
      if (currentPassword === newPassword) {
        res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
        return;
      }

      // 4. Validate password requirements
      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Password must contain at least 8 characters.' });
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        res.status(400).json({ success: false, message: 'Password must contain at least one uppercase letter.' });
        return;
      }
      if (!/[a-z]/.test(newPassword)) {
        res.status(400).json({ success: false, message: 'Password must contain at least one lowercase letter.' });
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        res.status(400).json({ success: false, message: 'Password must contain at least one number.' });
        return;
      }

      // 5. Hash new password
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.'
      });
    } catch (error: any) {
      console.error('[AuthController.changePassword] Error:', error);
      res.status(500).json({ success: false, message: 'Server error while changing password.', error: error.message });
    }
  }
}

