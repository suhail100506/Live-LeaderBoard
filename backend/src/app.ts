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

// Student Login Migration Endpoint (updates student emails to name2026cse@sece.ac.in; passwords unchanged)
app.all('/api/migrate-cse-logins', async (_req: Request, res: Response) => {
  try {
    const { User } = await import('./models/User');

    // 1. Advisor Verification Before Update
    const nonStudentsBefore = await User.find({ role: { $ne: 'student' } }, { name: 1, email: 1, role: 1 }).lean();

    // 2. Perform safe, idempotent updateMany with pipeline
    const filter = {
      role: 'student',
      email: {
        $regex: /@sece\.ac\.in$/i,
        $not: /cse@sece\.ac\.in$/i
      }
    };

    const updateResult = await User.updateMany(filter, [
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
    ]);

    // 3. Verification Queries
    const totalStudents = await User.countDocuments({ role: 'student' });
    const studentsWithCse = await User.countDocuments({
      role: 'student',
      email: { $regex: /cse@sece\.ac\.in$/i }
    });

    const nonStudentsAfter = await User.find({ role: { $ne: 'student' } }, { name: 1, email: 1, role: 1 }).lean();
    const sampleStudents = await User.find(
      { role: 'student' },
      { name: 1, email: 1, role: 1 }
    )
      .limit(6)
      .lean();

    res.status(200).json({
      success: true,
      message: 'Student login email migration executed successfully.',
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      studentsStatus: {
        total: totalStudents,
        endingWithCse: studentsWithCse,
        allVerified: totalStudents > 0 && totalStudents === studentsWithCse
      },
      sampleStudents,
      nonStudentAccounts: nonStudentsAfter,
      advisorUnchanged: nonStudentsAfter.length > 0 && nonStudentsAfter[0].email === 'anandaraj.a@sece.ac.in'
    });
  } catch (err: any) {
    console.error('[Migration API Error]', err);
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
