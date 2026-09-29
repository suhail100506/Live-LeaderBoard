import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { uploadScreenshot } from '../middleware/upload.middleware';

const router = Router();

// Protect all student routes
router.use(authenticate, requireRole('student'));

router.get('/dashboard', StudentController.getDashboard);
router.get('/questions/:questionId', StudentController.getQuestionDetails);
router.post('/submissions', uploadScreenshot.single('screenshot'), StudentController.submitScreenshot);
router.delete('/submissions', StudentController.removeSubmission);
router.post('/submissions/remove', StudentController.removeSubmission);
router.get('/leaderboard', StudentController.getLeaderboard);

export default router;
