import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';
import { authenticate } from './middleware/auth.middleware';
import { AdminController } from './controllers/admin.controller';

const app: Application = express();

// Allowed origins helper (supports comma-separated list, Vercel preview domains, and localhost)
const rawFrontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '');
      if (
        rawFrontendUrls.includes(clean) ||
        rawFrontendUrls.includes('*') ||
        /\.vercel\.app$/.test(clean) ||
        /^http:\/\/localhost:\d+$/.test(clean)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving for uploads (screenshots)
const uploadsPath = path.join(__dirname, '../uploads');
const rootUploadsPath = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/uploads', express.static(rootUploadsPath));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Student Login Migration Endpoint (adds 'cse' to all student emails and passwords)
app.all('/api/migrate-cse-logins', async (_req: Request, res: Response) => {
  try {
    const { User } = await import('./models/User');
    const bcrypt = (await import('bcryptjs')).default;
    const students = await User.find({ role: 'student' });
    let updatedCount = 0;
    const samples: any[] = [];

    for (const student of students) {
      if (student.email.includes('@sece.ac.in') && !student.email.includes('cse@sece.ac.in')) {
        const oldEmail = student.email;
        const newEmail = student.email.replace('@sece.ac.in', 'cse@sece.ac.in').toLowerCase();
        student.email = newEmail;
        student.passwordHash = await bcrypt.hash(newEmail, 10);
        await student.save();
        updatedCount++;
        if (samples.length < 5) {
          samples.push({ name: student.name, oldEmail, newEmail });
        }
      }
    }

    const cseCount = await User.countDocuments({
      role: 'student',
      email: { $regex: 'cse@sece\\.ac\\.in$', $options: 'i' }
    });

    const advisor = await User.findOne({ role: 'admin' });

    res.status(200).json({
      success: true,
      message: `Migrated ${updatedCount} students. Total student accounts with cse: ${cseCount}/${students.length}`,
      advisor: advisor ? { name: advisor.name, email: advisor.email, role: advisor.role } : null,
      samples
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/submissions/student/:studentId', authenticate, AdminController.getStudentSubmissions);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[App Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
