import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Assessment } from '../models/Assessment';
import { Question } from '../models/Question';
import { StudentAssignment } from '../models/StudentAssignment';
import { Submission } from '../models/Submission';
import { Evaluation } from '../models/Evaluation';
import { ScoreService } from '../services/score.service';

export class StudentController {
  /**
   * Helper to ensure student has deterministic randomized questions assigned
   */
  private static async getOrCreateAssignment(assessmentId: string, studentId: string) {
    let assignment = await StudentAssignment.findOne({
      assessmentId: new mongoose.Types.ObjectId(assessmentId),
      studentId: new mongoose.Types.ObjectId(studentId)
    }).populate('questions.questionId');

    if (assignment) {
      return assignment;
    }

    // Need to generate assignment deterministically from pool
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Pick questions from the assessment question pool or active questions
    let pool: any[] = [];
    if (assessment.questionPool && assessment.questionPool.length > 0) {
      pool = await Question.find({ _id: { $in: assessment.questionPool }, active: true });
    } else {
      pool = await Question.find({ active: true });
    }

    if (pool.length === 0) {
      throw new Error('No active questions found in pool');
    }

    // Randomize selection balanced by difficulty if possible
    const easy = pool.filter((q) => q.difficulty === 'easy');
    const medium = pool.filter((q) => q.difficulty === 'medium');
    const hard = pool.filter((q) => q.difficulty === 'hard');

    const shuffle = (array: any[]) => [...array].sort(() => 0.5 - Math.random());
    const selectedQuestions: any[] = [];

    const numNeeded = assessment.totalQuestions || 6;

    // Pick 2 easy, 2 medium, 1 hard if available
    const pickedEasy = shuffle(easy).slice(0, 2);
    const pickedMed = shuffle(medium).slice(0, 2);
    const pickedHard = shuffle(hard).slice(0, 1);

    selectedQuestions.push(...pickedEasy, ...pickedMed, ...pickedHard);

    // If still less than needed, fill from remaining pool
    if (selectedQuestions.length < numNeeded) {
      const selectedIds = new Set(selectedQuestions.map((q) => q._id.toString()));
      const remaining = pool.filter((q) => !selectedIds.has(q._id.toString()));
      selectedQuestions.push(...shuffle(remaining).slice(0, numNeeded - selectedQuestions.length));
    }

    // Map to assignment schema
    const assignedQuestionItems = selectedQuestions.slice(0, numNeeded).map((q, index) => ({
      questionId: q._id,
      order: index + 1,
      status: 'pending' as const
    }));

    assignment = await StudentAssignment.create({
      assessmentId: new mongoose.Types.ObjectId(assessmentId),
      studentId: new mongoose.Types.ObjectId(studentId),
      questions: assignedQuestionItems,
      startedAt: new Date()
    });

    return await assignment.populate('questions.questionId');
  }

  static async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user!._id.toString();

      // Find the active assessment
      let assessment = await Assessment.findOne({ status: 'LIVE' });
      if (!assessment) {
        assessment = await Assessment.findOne().sort({ createdAt: -1 });
      }

      if (!assessment) {
        res.status(200).json({
          success: true,
          hasActiveAssessment: false,
          message: 'No assessments currently available'
        });
        return;
      }

      const assignment = await StudentController.getOrCreateAssignment(assessment._id.toString(), studentId);
      const scoreData = await ScoreService.calculateStudentScore(assessment._id.toString(), studentId);
      const leaderboard = await ScoreService.getLeaderboard(assessment._id.toString());
      const myEntry = leaderboard.find((l) => l.studentId === studentId);

      // Fetch all submissions by this student
      const submissions = await Submission.find({
        assessmentId: assessment._id,
        studentId: req.user!._id
      });

      const submissionMap = new Map();
      submissions.forEach((s) => {
        submissionMap.set(s.questionId.toString(), s);
      });

      // Fetch evaluations
      const evaluations = await Evaluation.find({
        assessmentId: assessment._id,
        studentId: req.user!._id
      });
      const evalMap = new Map();
      evaluations.forEach((e) => {
        evalMap.set(e.questionId.toString(), e);
      });

      const questionsList = assignment.questions.map((item: any) => {
        const q = item.questionId;
        const sub = q ? submissionMap.get(q._id.toString()) : null;
        const ev = q ? evalMap.get(q._id.toString()) : null;

        return {
          questionId: q?._id,
          order: item.order,
          title: q?.title,
          difficulty: q?.difficulty,
          marks: q?.marks,
          category: q?.category,
          isSubmitted: !!sub,
          isEvaluated: !!ev,
          marksObtained: ev ? ev.marksObtained : null,
          feedback: ev ? ev.feedback : null,
          submissionStatus: sub ? sub.status : 'NOT_SUBMITTED'
        };
      });

      res.status(200).json({
        success: true,
        hasActiveAssessment: true,
        assessment: {
          id: assessment._id,
          title: assessment.title,
          description: assessment.description,
          status: assessment.status,
          durationMinutes: assessment.durationMinutes,
          totalQuestions: assignment.questions.length
        },
        student: {
          name: req.user!.name,
          studentId: req.user!.studentId,
          email: req.user!.email,
          department: req.user!.department,
          section: req.user!.section
        },
        stats: {
          totalMarks: scoreData.totalMarks,
          maxPossibleMarks: scoreData.maxPossibleMarks,
          percentage: scoreData.percentage,
          completedQuestions: scoreData.completedQuestions,
          totalQuestions: assignment.questions.length,
          currentRank: myEntry ? myEntry.rank : '-'
        },
        questions: questionsList
      });
    } catch (error: any) {
      console.error('[StudentController.getDashboard] Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getQuestionDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { questionId } = req.params;
      const studentId = req.user!._id.toString();

      const question = await Question.findById(questionId);
      if (!question) {
        res.status(404).json({ success: false, message: 'Question not found' });
        return;
      }

      // Check submission status
      const submission = await Submission.findOne({
        studentId: req.user!._id,
        questionId: question._id
      });

      // Check evaluation
      let evaluation = null;
      if (submission) {
        evaluation = await Evaluation.findOne({ submissionId: submission._id });
      }

      res.status(200).json({
        success: true,
        question: {
          id: question._id,
          title: question.title,
          description: question.description,
          language: question.language,
          difficulty: question.difficulty,
          category: question.category,
          marks: question.marks,
          inputFormat: question.inputFormat,
          outputFormat: question.outputFormat,
          constraints: question.constraints,
          sampleInput: question.sampleInput,
          sampleOutput: question.sampleOutput
        },
        submission: submission
          ? {
              id: submission._id,
              screenshotUrl: submission.screenshotUrl,
              screenshotFileName: submission.screenshotFileName,
              codeSnippet: submission.codeSnippet,
              submittedAt: submission.submittedAt,
              status: submission.status
            }
          : null,
        evaluation: evaluation
          ? {
              marksObtained: evaluation.marksObtained,
              maximumMarks: evaluation.maximumMarks,
              feedback: evaluation.feedback,
              evaluatedAt: evaluation.evaluatedAt
            }
          : null
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async submitScreenshot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user!._id;
      const { questionId, assessmentId, codeSnippet } = req.body;

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload a screenshot image' });
        return;
      }

      if (!questionId || !assessmentId) {
        res.status(400).json({ success: false, message: 'Question ID and Assessment ID are required' });
        return;
      }

      // Verify assessment status
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment || assessment.status !== 'LIVE') {
        res.status(400).json({ success: false, message: 'Assessment is not currently active for submissions.' });
        return;
      }

      // Verify student assignment owns this question
      const assignment = await StudentAssignment.findOne({
        assessmentId: new mongoose.Types.ObjectId(assessmentId),
        studentId: studentId
      });

      if (!assignment) {
        res.status(403).json({ success: false, message: 'Student is not assigned to this assessment' });
        return;
      }

      const hasQuestion = assignment.questions.some(
        (q) => q.questionId.toString() === questionId
      );

      if (!hasQuestion) {
        res.status(403).json({ success: false, message: 'This question is not in your assigned question set' });
        return;
      }

      const relativeScreenshotUrl = `/uploads/submissions/${req.file.filename}`;

      // Check if already submitted
      let submission = await Submission.findOne({
        assessmentId: new mongoose.Types.ObjectId(assessmentId),
        studentId: studentId,
        questionId: new mongoose.Types.ObjectId(questionId)
      });

      if (submission) {
        if (submission.status === 'EVALUATED') {
          // Reset evaluation so new screenshot can be re-evaluated by faculty
          await Evaluation.deleteMany({ submissionId: submission._id });
        }

        // Update submission
        submission.screenshotUrl = relativeScreenshotUrl;
        submission.screenshotFileName = req.file.originalname;
        submission.codeSnippet = codeSnippet || submission.codeSnippet;
        submission.submittedAt = new Date();
        submission.status = 'SUBMITTED';
        submission.attemptNumber += 1;
        await submission.save();
      } else {
        submission = await Submission.create({
          assessmentId: new mongoose.Types.ObjectId(assessmentId),
          studentId: studentId,
          questionId: new mongoose.Types.ObjectId(questionId),
          screenshotUrl: relativeScreenshotUrl,
          screenshotFileName: req.file.originalname,
          codeSnippet: codeSnippet || '',
          submittedAt: new Date(),
          status: 'SUBMITTED',
          attemptNumber: 1
        });
      }

      // Update question status in assignment
      await StudentAssignment.updateOne(
        {
          _id: assignment._id,
          'questions.questionId': new mongoose.Types.ObjectId(questionId)
        },
        {
          $set: { 'questions.$.status': 'submitted' }
        }
      );

      res.status(200).json({
        success: true,
        message: 'Screenshot submitted successfully for evaluation',
        submission: {
          id: submission._id,
          screenshotUrl: submission.screenshotUrl,
          screenshotFileName: submission.screenshotFileName,
          submittedAt: submission.submittedAt,
          status: submission.status
        }
      });
    } catch (error: any) {
      console.error('[StudentController.submitScreenshot] Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async removeSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user!._id;
      const questionId = req.body?.questionId || req.query.questionId;
      const assessmentId = req.body?.assessmentId || req.query.assessmentId;

      if (!questionId) {
        res.status(400).json({ success: false, message: 'Question ID is required' });
        return;
      }

      const query: any = {
        studentId: studentId,
        questionId: new mongoose.Types.ObjectId(questionId as string)
      };
      if (assessmentId) {
        query.assessmentId = new mongoose.Types.ObjectId(assessmentId as string);
      }

      const submission = await Submission.findOne(query);

      if (!submission) {
        res.status(404).json({ success: false, message: 'Submission not found' });
        return;
      }

      const resolvedAssessmentId = submission.assessmentId;

      // Delete associated evaluation
      await Evaluation.deleteMany({ submissionId: submission._id });

      // Delete the submission
      await Submission.deleteOne({ _id: submission._id });

      // Reset question status in student assignment to 'pending'
      await StudentAssignment.updateOne(
        {
          assessmentId: resolvedAssessmentId,
          studentId: studentId,
          'questions.questionId': new mongoose.Types.ObjectId(questionId as string)
        },
        {
          $set: { 'questions.$.status': 'pending' }
        }
      );

      // Broadcast leaderboard update
      try {
        await ScoreService.broadcastUpdates(resolvedAssessmentId.toString());
      } catch (err) {
        console.error('[StudentController.removeSubmission] Error broadcasting updates:', err);
      }

      res.status(200).json({
        success: true,
        message: 'Submission removed successfully'
      });
    } catch (error: any) {
      console.error('[StudentController.removeSubmission] Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      let assessment = await Assessment.findOne({ status: 'LIVE' });
      if (!assessment) {
        assessment = await Assessment.findOne().sort({ createdAt: -1 });
      }

      if (!assessment) {
        res.status(200).json({
          success: true,
          leaderboard: [],
          submittedStudentsCount: 0,
          totalSubmissionsCount: 0,
          isLeaderboardStarted: false,
          minSubmissionsRequired: 3
        });
        return;
      }

      const leaderboard = await ScoreService.getLeaderboard(assessment._id.toString());
      const stats = await ScoreService.getLeaderboardStats(assessment._id.toString());
      res.status(200).json({
        success: true,
        assessmentTitle: assessment.title,
        assessmentStatus: assessment.status,
        leaderboard,
        ...stats
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
