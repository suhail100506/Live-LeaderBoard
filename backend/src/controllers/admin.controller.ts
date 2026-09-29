import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { Question } from '../models/Question';
import { Assessment } from '../models/Assessment';
import { Submission } from '../models/Submission';
import { Evaluation } from '../models/Evaluation';
import { StudentAssignment } from '../models/StudentAssignment';
import { AuditLog } from '../models/AuditLog';
import { ScoreService } from '../services/score.service';

export class AdminController {
  static async getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
    try {
      let totalStudents = await User.countDocuments({ role: 'student' });
      if (!totalStudents || totalStudents === 0) {
        const assignmentCount = await StudentAssignment.countDocuments();
        totalStudents = assignmentCount > 0 ? assignmentCount : 66;
      }
      const totalQuestions = await Question.countDocuments({ active: true });
      const totalSubmissions = await Submission.countDocuments();
      const evaluatedCount = await Evaluation.countDocuments();
      const pendingEvaluations = Math.max(0, totalSubmissions - evaluatedCount);

      let assessment = await Assessment.findOne({ status: 'LIVE' });
      if (!assessment) {
        assessment = await Assessment.findOne().sort({ createdAt: -1 });
      }

      let highestScore = 0;
      let averageScore = 0;

      if (assessment) {
        const leaderboard = await ScoreService.getLeaderboard(assessment._id.toString());
        if (leaderboard.length > 0) {
          highestScore = leaderboard[0].totalMarks;
          const sum = leaderboard.reduce((acc, curr) => acc + curr.totalMarks, 0);
          averageScore = Math.round((sum / leaderboard.length) * 10) / 10;
        }
      }

      res.status(200).json({
        success: true,
        stats: {
          totalStudents,
          totalQuestions,
          totalSubmissions,
          evaluatedCount,
          pendingEvaluations,
          highestScore,
          averageScore,
          assessmentStatus: assessment ? assessment.status : 'NO_ASSESSMENT',
          assessmentTitle: assessment ? assessment.title : 'None'
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getStudents(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const students = await User.find({ role: 'student' })
        .select('-passwordHash')
        .sort({ studentId: 1 });

      res.status(200).json({ success: true, students });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getQuestions(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const questions = await Question.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, questions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createQuestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        difficulty,
        category,
        marks,
        timeLimitMinutes,
        inputFormat,
        outputFormat,
        constraints,
        sampleInput,
        sampleOutput
      } = req.body;

      if (!title || !description || !marks) {
        res.status(400).json({ success: false, message: 'Title, description, and marks are required' });
        return;
      }

      const question = await Question.create({
        title,
        description,
        difficulty: difficulty || 'easy',
        category: category || 'General',
        marks: Number(marks),
        timeLimitMinutes: Number(timeLimitMinutes) || 15,
        inputFormat,
        outputFormat,
        constraints,
        sampleInput,
        sampleOutput,
        createdBy: req.user!._id
      });

      res.status(201).json({ success: true, message: 'Question created successfully', question });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateQuestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await Question.findByIdAndUpdate(id, req.body, { new: true });
      if (!updated) {
        res.status(404).json({ success: false, message: 'Question not found' });
        return;
      }
      res.status(200).json({ success: true, question: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteQuestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await Question.findByIdAndUpdate(id, { active: false });
      res.status(200).json({ success: true, message: 'Question deactivated' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all submissions with filtering (student, question, status)
   */
  static async getSubmissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, studentId, questionId } = req.query;

      const query: any = {};
      if (studentId) query.studentId = new mongoose.Types.ObjectId(studentId as string);
      if (questionId) query.questionId = new mongoose.Types.ObjectId(questionId as string);

      const submissions = await Submission.find(query)
        .populate('studentId', 'name studentId email department section')
        .populate('questionId', 'title difficulty marks category')
        .sort({ submittedAt: -1 });

      // Join evaluations
      const evalList = await Evaluation.find();
      const evalMap = new Map();
      evalList.forEach((e) => evalMap.set(e.submissionId.toString(), e));

      let result = submissions.map((sub: any) => {
        const ev = evalMap.get(sub._id.toString());
        return {
          id: sub._id,
          assessmentId: sub.assessmentId,
          student: sub.studentId,
          question: sub.questionId,
          screenshotUrl: sub.screenshotUrl,
          codeSnippet: sub.codeSnippet,
          submittedAt: sub.submittedAt,
          attemptNumber: sub.attemptNumber,
          isEvaluated: !!ev,
          evaluation: ev
            ? {
                id: ev._id,
                marksObtained: ev.marksObtained,
                maximumMarks: ev.maximumMarks,
                feedback: ev.feedback,
                evaluatedAt: ev.evaluatedAt
              }
            : null
        };
      });

      if (status === 'PENDING') {
        result = result.filter((s) => !s.isEvaluated);
      } else if (status === 'EVALUATED') {
        result = result.filter((s) => s.isEvaluated);
      }

      res.status(200).json({ success: true, submissions: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all submissions and full question status history for a specific student
   */
  static async getStudentSubmissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        res.status(400).json({ success: false, message: 'Student ID is required' });
        return;
      }

      // Look up student by ObjectId, studentId (e.g. 24CSE001), or email
      let user = null;
      if (mongoose.Types.ObjectId.isValid(studentId)) {
        user = await User.findById(studentId);
      }
      if (!user) {
        user = await User.findOne({
          $or: [
            { studentId: studentId },
            { email: studentId.toLowerCase() },
            { name: new RegExp(`^${studentId}$`, 'i') }
          ]
        });
      }

      if (!user) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      // Find active assessment
      let assessment = await Assessment.findOne({ status: 'LIVE' });
      if (!assessment) {
        assessment = await Assessment.findOne().sort({ createdAt: -1 });
      }

      // Fetch student assignment for this assessment (or latest)
      let assignment = null;
      if (assessment) {
        assignment = await StudentAssignment.findOne({
          studentId: user._id,
          assessmentId: assessment._id
        }).populate('questions.questionId');
      }
      if (!assignment) {
        assignment = await StudentAssignment.findOne({
          studentId: user._id
        }).populate('questions.questionId');
      }

      // Fetch all submissions by this student
      const submissions = await Submission.find({ studentId: user._id })
        .populate('questionId', 'title difficulty marks category')
        .sort({ submittedAt: -1 });

      // Fetch all evaluations for this student
      const evaluations = await Evaluation.find({ studentId: user._id });
      const evalMap = new Map();
      evaluations.forEach((e) => {
        evalMap.set(e.questionId.toString(), e);
        evalMap.set(e.submissionId.toString(), e);
      });

      const subMap = new Map();
      submissions.forEach((s) => {
        const qId = s.questionId?._id?.toString() || s.questionId?.toString();
        if (qId) subMap.set(qId, s);
      });

      // Build structured questions history
      const historyList: any[] = [];
      const handledQIds = new Set<string>();

      if (assignment && assignment.questions && assignment.questions.length > 0) {
        for (const item of assignment.questions) {
          const q: any = item.questionId;
          if (!q) continue;
          const qIdStr = q._id.toString();
          handledQIds.add(qIdStr);

          const sub = subMap.get(qIdStr);
          const ev = sub ? (evalMap.get(sub._id.toString()) || evalMap.get(qIdStr)) : evalMap.get(qIdStr);

          const status = ev
            ? 'EVALUATED'
            : sub
            ? (sub.status === 'UNDER_REVIEW' || sub.status === 'SUBMITTED' ? 'PENDING' : sub.status)
            : 'NOT_SUBMITTED';

          const statusLabel = ev
            ? 'Evaluated'
            : sub
            ? 'Pending Review'
            : 'Not Submitted';

          historyList.push({
            order: item.order,
            questionId: q._id,
            questionTitle: q.title,
            difficulty: q.difficulty,
            category: q.category,
            maxMarks: q.marks,
            awardedMarks: ev ? ev.marksObtained : null,
            status,
            statusLabel,
            screenshotUrl: sub ? sub.screenshotUrl : null,
            screenshotFileName: sub ? sub.screenshotFileName : null,
            codeSnippet: sub ? sub.codeSnippet : null,
            submittedAt: sub ? sub.submittedAt : null,
            attemptNumber: sub ? sub.attemptNumber : 0,
            feedback: ev ? ev.feedback : null,
            evaluatedAt: ev ? ev.evaluatedAt : null,
            submission: sub
              ? {
                  id: sub._id,
                  assessmentId: sub.assessmentId,
                  student: {
                    _id: user._id,
                    name: user.name,
                    studentId: user.studentId,
                    email: user.email,
                    department: user.department,
                    section: user.section
                  },
                  question: {
                    _id: q._id,
                    title: q.title,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    category: q.category
                  },
                  screenshotUrl: sub.screenshotUrl,
                  screenshotFileName: sub.screenshotFileName,
                  codeSnippet: sub.codeSnippet,
                  submittedAt: sub.submittedAt,
                  attemptNumber: sub.attemptNumber,
                  isEvaluated: !!ev,
                  evaluation: ev
                    ? {
                        id: ev._id,
                        marksObtained: ev.marksObtained,
                        maximumMarks: ev.maximumMarks,
                        feedback: ev.feedback,
                        evaluatedAt: ev.evaluatedAt
                      }
                    : null
                }
              : null
          });
        }
      }

      // Add any submissions for questions not in the assignment (if any)
      for (const sub of submissions) {
        const q: any = sub.questionId;
        if (!q) continue;
        const qIdStr = q._id.toString();
        if (handledQIds.has(qIdStr)) continue;

        const ev = evalMap.get(sub._id.toString()) || evalMap.get(qIdStr);
        historyList.push({
          order: historyList.length + 1,
          questionId: q._id,
          questionTitle: q.title,
          difficulty: q.difficulty,
          category: q.category,
          maxMarks: q.marks,
          awardedMarks: ev ? ev.marksObtained : null,
          status: ev ? 'EVALUATED' : 'PENDING',
          statusLabel: ev ? 'Evaluated' : 'Pending Review',
          screenshotUrl: sub.screenshotUrl,
          screenshotFileName: sub.screenshotFileName,
          codeSnippet: sub.codeSnippet,
          submittedAt: sub.submittedAt,
          attemptNumber: sub.attemptNumber,
          feedback: ev ? ev.feedback : null,
          evaluatedAt: ev ? ev.evaluatedAt : null,
          submission: {
            id: sub._id,
            assessmentId: sub.assessmentId,
            student: {
              _id: user._id,
              name: user.name,
              studentId: user.studentId,
              email: user.email,
              department: user.department,
              section: user.section
            },
            question: {
              _id: q._id,
              title: q.title,
              difficulty: q.difficulty,
              marks: q.marks,
              category: q.category
            },
            screenshotUrl: sub.screenshotUrl,
            screenshotFileName: sub.screenshotFileName,
            codeSnippet: sub.codeSnippet,
            submittedAt: sub.submittedAt,
            attemptNumber: sub.attemptNumber,
            isEvaluated: !!ev,
            evaluation: ev
              ? {
                  id: ev._id,
                  marksObtained: ev.marksObtained,
                  maximumMarks: ev.maximumMarks,
                  feedback: ev.feedback,
                  evaluatedAt: ev.evaluatedAt
                }
              : null
          }
        });
      }

      // Compute statistics
      const totalAssigned = historyList.length;
      const submittedItems = historyList.filter((item) => item.status !== 'NOT_SUBMITTED');
      const totalSubmissions = submittedItems.length;
      const evaluatedItems = historyList.filter((item) => item.status === 'EVALUATED');
      const evaluatedCount = evaluatedItems.length;
      const pendingCount = historyList.filter((item) => item.status === 'PENDING').length;
      const totalMarks = evaluatedItems.reduce((acc, curr) => acc + (curr.awardedMarks || 0), 0);
      const maxPossibleMarks = historyList.reduce((acc, curr) => acc + (curr.maxMarks || 0), 0);
      const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 100) : 0;

      res.status(200).json({
        success: true,
        student: {
          id: user._id,
          _id: user._id,
          name: user.name,
          studentId: user.studentId,
          email: user.email,
          department: user.department,
          section: user.section
        },
        stats: {
          totalAssigned,
          totalSubmissions,
          evaluatedCount,
          pendingCount,
          totalMarks,
          maxPossibleMarks,
          percentage
        },
        submissions: historyList
      });
    } catch (error: any) {
      console.error('[AdminController.getStudentSubmissions] Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * CORE RUNTIME MARKING ENGINE
   * Admin enters/updates marks for an individual student's question submission.
   * Immediately recalculates score, leaderboard, and pushes Socket.IO event.
   */
  static async evaluateSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { submissionId, marksObtained, feedback } = req.body;
      const adminId = req.user!._id;

      if (!submissionId || marksObtained === undefined || marksObtained === null) {
        res.status(400).json({ success: false, message: 'submissionId and marksObtained are required' });
        return;
      }

      const submission = await Submission.findById(submissionId).populate('questionId');
      if (!submission) {
        res.status(404).json({ success: false, message: 'Submission not found' });
        return;
      }

      const question = submission.questionId as any;
      const maxMarks = question.marks || 10;
      const marks = Number(marksObtained);

      if (marks < 0 || marks > maxMarks) {
        res.status(400).json({
          success: false,
          message: `Marks must be between 0 and maximum marks (${maxMarks})`
        });
        return;
      }

      // Check for existing evaluation
      let evaluation = await Evaluation.findOne({ submissionId: submission._id });
      let oldMarks = 0;
      let isUpdate = false;

      if (evaluation) {
        oldMarks = evaluation.marksObtained;
        isUpdate = true;
        evaluation.marksObtained = marks;
        evaluation.feedback = feedback !== undefined ? feedback : evaluation.feedback;
        evaluation.evaluatedBy = adminId;
        evaluation.evaluatedAt = new Date();
        await evaluation.save();
      } else {
        evaluation = await Evaluation.create({
          assessmentId: submission.assessmentId,
          submissionId: submission._id,
          studentId: submission.studentId,
          questionId: question._id,
          marksObtained: marks,
          maximumMarks: maxMarks,
          feedback: feedback || '',
          evaluatedBy: adminId,
          evaluatedAt: new Date()
        });
      }

      // Update submission status
      submission.status = 'EVALUATED';
      await submission.save();

      // Update assignment question status
      await StudentAssignment.updateOne(
        {
          assessmentId: submission.assessmentId,
          studentId: submission.studentId,
          'questions.questionId': question._id
        },
        {
          $set: { 'questions.$.status': 'evaluated' }
        }
      );

      // Record Audit Log for accountability
      await AuditLog.create({
        adminId,
        action: isUpdate ? 'MARK_UPDATED' : 'MARK_AWARDED',
        submissionId: submission._id,
        studentId: submission.studentId,
        questionId: question._id,
        oldMarks: isUpdate ? oldMarks : undefined,
        newMarks: marks,
        details: feedback,
        timestamp: new Date()
      });

      // Recalculate student score & trigger instant Socket.IO broadcast
      const assessmentIdStr = submission.assessmentId.toString();
      const studentIdStr = submission.studentId.toString();
      await ScoreService.broadcastUpdates(assessmentIdStr, studentIdStr);

      const updatedScore = await ScoreService.calculateStudentScore(assessmentIdStr, studentIdStr);

      res.status(200).json({
        success: true,
        message: isUpdate ? 'Marks updated successfully' : 'Marks awarded successfully',
        evaluation: {
          id: evaluation._id,
          marksObtained: evaluation.marksObtained,
          maximumMarks: evaluation.maximumMarks,
          feedback: evaluation.feedback,
          evaluatedAt: evaluation.evaluatedAt
        },
        studentScore: updatedScore
      });
    } catch (error: any) {
      console.error('[AdminController.evaluateSubmission] Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAuditLogs(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const logs = await AuditLog.find()
        .populate('adminId', 'name email')
        .populate('studentId', 'name studentId')
        .populate('questionId', 'title marks')
        .sort({ timestamp: -1 })
        .limit(50);

      res.status(200).json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateAssessmentStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const validStatuses = ['DRAFT', 'READY', 'LIVE', 'ENDED', 'RESULT_PUBLISHED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid assessment status' });
        return;
      }

      let assessment = await Assessment.findOne().sort({ createdAt: -1 });
      if (!assessment) {
        res.status(404).json({ success: false, message: 'Assessment not found' });
        return;
      }

      assessment.status = status;
      await assessment.save();

      // Log status change
      await AuditLog.create({
        adminId: req.user!._id,
        action: 'ASSESSMENT_STATUS_CHANGED',
        details: `Assessment status changed to ${status}`,
        timestamp: new Date()
      });

      // Broadcast leaderboard & status update
      await ScoreService.broadcastUpdates(assessment._id.toString());

      res.status(200).json({
        success: true,
        message: `Assessment status updated to ${status}`,
        assessment
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async removeSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const submission = await Submission.findById(id);
      if (!submission) {
        res.status(404).json({ success: false, message: 'Submission not found' });
        return;
      }

      await Evaluation.deleteMany({ submissionId: submission._id });
      await Submission.deleteOne({ _id: submission._id });

      await StudentAssignment.updateOne(
        {
          assessmentId: submission.assessmentId,
          studentId: submission.studentId,
          'questions.questionId': submission.questionId
        },
        {
          $set: { 'questions.$.status': 'pending' }
        }
      );

      try {
        await ScoreService.broadcastUpdates(submission.assessmentId.toString());
      } catch (err) {
        console.error('[AdminController.removeSubmission] Broadcast update error:', err);
      }

      res.status(200).json({ success: true, message: 'Submission removed successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
