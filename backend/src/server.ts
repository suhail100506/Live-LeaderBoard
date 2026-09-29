import http from 'http';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { User } from './models/User';
import { seedDatabase } from './seed';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Auto-seed if database is empty or has no admin
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database empty. Running auto-seeder...');
      await seedDatabase();
    } else {
      console.log(`[Server] Found ${userCount} existing users in database.`);
    }

    // 2.1 Auto-migrate student emails and passwords to include 'cse' (e.g. sanjai.g2026cse@sece.ac.in)
    const unmigratedStudents = await User.find({
      role: 'student',
      email: { $not: /cse@sece\.ac\.in$/i }
    });

    if (unmigratedStudents.length > 0) {
      const bcrypt = (await import('bcryptjs')).default;
      console.log(`[Server] Found ${unmigratedStudents.length} student accounts to migrate to 'cse@sece.ac.in'...`);
      for (const student of unmigratedStudents) {
        if (student.email.includes('@sece.ac.in') && !student.email.includes('cse@sece.ac.in')) {
          const newEmail = student.email.replace('@sece.ac.in', 'cse@sece.ac.in').toLowerCase();
          student.email = newEmail;
          student.passwordHash = await bcrypt.hash(newEmail, 10);
          await student.save();
        }
      }
      console.log(`[Server] Successfully migrated ${unmigratedStudents.length} student logins and passwords with 'cse'!`);
    } else {
      console.log(`[Server] All student accounts already verified with 'cse@sece.ac.in' logins & passwords.`);
    }

    // 3. Create HTTP & Socket.IO Server
    const server = http.createServer(app);
    initSocket(server);

    // 4. Start Listening
    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Live Leaderboard Backend Server running on port ${PORT}`);
      console.log(`📡 WebSocket server initialized`);
      console.log(`🌐 API base: http://localhost:${PORT}/api`);
      console.log(`🖼️ Static uploads: http://localhost:${PORT}/uploads`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
};

startServer();
