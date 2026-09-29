import mongoose from 'mongoose';
import { Evaluation } from '../models/Evaluation';
import { Submission } from '../models/Submission';
import { StudentAssignment } from '../models/StudentAssignment';
import { User } from '../models/User';
import { getIO } from '../config/socket';

export interface LeaderboardEntry {
  rank: number;
  studentId: string; // Mongo ID
  rollNumber: string; // e.g. 24CSE001
  name: string;
  department: string;
  section: string;
  totalMarks: number;
  maxPossibleMarks: number;
  percentage: number;
  completedQuestions: number;
  totalAssignedQuestions: number;
  lastEvaluationTime: Date | null;
  hasSubmission?: boolean;
}

export class ScoreService {
  /**
   * Calculate live score for a specific student in an assessment
   */
  static async calculateStudentScore(assessmentId: string, studentId: string) {
    const assignment = await StudentAssignment.findOne({
      assessmentId: new mongoose.Types.ObjectId(assessmentId),
      studentId: new mongoose.Types.ObjectId(studentId)
    }).populate('questions.questionId');

    const evaluations = await Evaluation.find({
      assessmentId: new mongoose.Types.ObjectId(assessmentId),
      studentId: new mongoose.Types.ObjectId(studentId)
    });

    let totalMarks = 0;
    let maxPossibleMarks = 0;
    let completedCount = 0;
    let lastEvalTime: Date | null = null;

    if (assignment && assignment.questions) {
      assignment.questions.forEach((q: any) => {
        if (q.questionId && typeof q.questionId.marks === 'number') {
          maxPossibleMarks += q.questionId.marks;
        }
      });
    }

    evaluations.forEach((ev) => {
      totalMarks += ev.marksObtained;
      completedCount++;
      if (!lastEvalTime || ev.evaluatedAt > lastEvalTime) {
        lastEvalTime = ev.evaluatedAt;
      }
    });

    const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 100 * 10) / 10 : 0;

    return {
      totalMarks,
      maxPossibleMarks: maxPossibleMarks || 80,
      percentage,
      completedQuestions: completedCount,
      totalAssignedQuestions: assignment?.questions.length || 0,
      lastEvaluationTime: lastEvalTime
    };
  }

  /**
   * Recalculate full leaderboard for an assessment with tie-breaker logic (Batch-optimized)
   */
  static async getLeaderboard(assessmentId: string): Promise<LeaderboardEntry[]> {
    // 1. Fetch all assignments with populated student and questions in 1 query
    const assignments = await StudentAssignment.find({
      assessmentId: new mongoose.Types.ObjectId(assessmentId)
    })
      .populate('studentId', 'name studentId department section email')
      .populate('questions.questionId', 'marks');

    // 2. Fetch all evaluations for this assessment in 1 query
    const allEvaluations = await Evaluation.find({
      assessmentId: new mongoose.Types.ObjectId(assessmentId)
    });

    // 3. Fetch all submissions for this assessment
    const allSubmissions = await Submission.find({
      assessmentId: new mongoose.Types.ObjectId(assessmentId)
    });

    const submittedStudentIds = new Set<string>();
    for (const sub of allSubmissions) {
      submittedStudentIds.add(sub.studentId.toString());
    }

    const evalMap = new Map<string, any[]>();
    for (const ev of allEvaluations) {
      const sId = ev.studentId.toString();
      if (!evalMap.has(sId)) {
        evalMap.set(sId, []);
      }
      evalMap.get(sId)!.push(ev);
    }

    const leaderboardList: LeaderboardEntry[] = [];

    for (const assign of assignments) {
      const student = assign.studentId as any;
      if (!student) continue;

      const studentIdStr = student._id.toString();
      const studentEvals = evalMap.get(studentIdStr) || [];
      const hasSub = submittedStudentIds.has(studentIdStr) || studentEvals.length > 0;

      let totalMarks = 0;
      let maxPossibleMarks = 0;
      let completedCount = 0;
      let lastEvalTime: Date | null = null;

      if (assign.questions) {
        assign.questions.forEach((q: any) => {
          if (q.questionId && typeof q.questionId.marks === 'number') {
            maxPossibleMarks += q.questionId.marks;
          }
        });
      }

      studentEvals.forEach((ev) => {
        totalMarks += ev.marksObtained;
        completedCount++;
        if (!lastEvalTime || ev.evaluatedAt > lastEvalTime) {
          lastEvalTime = ev.evaluatedAt;
        }
      });

      const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 100 * 10) / 10 : 0;

      leaderboardList.push({
        rank: 0,
        studentId: studentIdStr,
        rollNumber: student.studentId || 'N/A',
        name: student.name,
        department: student.department || 'CSE',
        section: student.section || 'A',
        totalMarks,
        maxPossibleMarks: maxPossibleMarks || 80,
        percentage,
        completedQuestions: completedCount,
        totalAssignedQuestions: assign.questions?.length || 0,
        lastEvaluationTime: lastEvalTime,
        hasSubmission: hasSub
      });
    }

    // Sort by:
    // 1. Total Marks DESC
    // 2. Completed Questions DESC
    // 3. Has Submissions DESC
    // 4. Last Evaluation Time ASC (earlier is better)
    leaderboardList.sort((a, b) => {
      if (b.totalMarks !== a.totalMarks) {
        return b.totalMarks - a.totalMarks;
      }
      if (b.completedQuestions !== a.completedQuestions) {
        return b.completedQuestions - a.completedQuestions;
      }
      const aSub = a.hasSubmission ? 1 : 0;
      const bSub = b.hasSubmission ? 1 : 0;
      if (bSub !== aSub) {
        return bSub - aSub;
      }
      if (a.lastEvaluationTime && b.lastEvaluationTime) {
        return a.lastEvaluationTime.getTime() - b.lastEvaluationTime.getTime();
      }
      return 0;
    });

    // Assign rank with standard competition ranking
    let currentRank = 1;
    for (let i = 0; i < leaderboardList.length; i++) {
      if (i > 0) {
        const prev = leaderboardList[i - 1];
        const curr = leaderboardList[i];
        if (
          curr.totalMarks === prev.totalMarks &&
          curr.completedQuestions === prev.completedQuestions
        ) {
          curr.rank = prev.rank;
        } else {
          curr.rank = i + 1;
        }
      } else {
        leaderboardList[0].rank = 1;
      }
    }

    return leaderboardList;
  }

  /**
   * Calculate summary stats for leaderboard unlock condition (minimum 3 student submissions)
   */
  static async getLeaderboardStats(assessmentId: string) {
    const allSubmissions = await Submission.find({
      assessmentId: new mongoose.Types.ObjectId(assessmentId)
    });
    const allEvaluations = await Evaluation.find({
      assessmentId: new mongoose.Types.ObjectId(assessmentId)
    });

    const activeStudentIds = new Set<string>();
    for (const s of allSubmissions) activeStudentIds.add(s.studentId.toString());
    for (const e of allEvaluations) activeStudentIds.add(e.studentId.toString());

    const submittedStudentsCount = activeStudentIds.size;
    return {
      totalSubmissionsCount: allSubmissions.length,
      submittedStudentsCount,
      isLeaderboardStarted: submittedStudentsCount >= 3,
      minSubmissionsRequired: 3
    };
  }

  /**
   * Real-time Broadcast via Socket.IO
   */
  static async broadcastUpdates(assessmentId: string, updatedStudentId?: string) {
    try {
      const io = getIO();
      const leaderboard = await this.getLeaderboard(assessmentId);
      const stats = await this.getLeaderboardStats(assessmentId);

      // Broadcast updated leaderboard to assessment room
      io.to(`assessment:${assessmentId}`).emit('leaderboard:update', {
        assessmentId,
        leaderboard,
        ...stats,
        updatedAt: new Date().toISOString()
      });

      // Also broadcast directly to general listeners
      io.emit('leaderboard:update', {
        assessmentId,
        leaderboard,
        ...stats,
        updatedAt: new Date().toISOString()
      });

      // If an individual student was updated, notify them privately
      if (updatedStudentId) {
        const studentScore = await this.calculateStudentScore(assessmentId, updatedStudentId);
        const myRankEntry = leaderboard.find((l) => l.studentId === updatedStudentId);

        io.to(`student:${updatedStudentId}`).emit('student:score_update', {
          assessmentId,
          ...studentScore,
          rank: myRankEntry ? myRankEntry.rank : null,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('[ScoreService] Broadcast error:', err);
    }
  }
}
