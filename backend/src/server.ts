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

    // 2.1 Auto-migrate student emails to include 'cse' (e.g. sanjai.g2026cse@sece.ac.in)
    // Passwords remain completely unchanged as requested
    const unmigratedQuery = {
      role: 'student',
      email: {
        $regex: /@sece\.ac\.in$/i,
        $not: /cse@sece\.ac\.in$/i
      }
    };

    const unmigratedStudents = await User.find(unmigratedQuery);

    if (unmigratedStudents.length > 0) {
      console.log(`[Server] Found ${unmigratedStudents.length} student accounts to update to 'cse@sece.ac.in' (passwords unchanged)...`);
      for (const student of unmigratedStudents) {
        student.email = student.email.replace(/@sece\.ac\.in$/i, 'cse@sece.ac.in').toLowerCase();
        await student.save();
      }
      console.log(`[Server] Successfully updated ${unmigratedStudents.length} student emails. Existing password hashes preserved!`);
    } else {
      console.log(`[Server] All student accounts already verified with 'cse@sece.ac.in' emails.`);
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
