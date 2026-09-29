import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);
router.put('/change-password', authenticate, AuthController.changePassword);
router.get('/demo-accounts', AuthController.getDemoAccounts);
router.all('/migrate-cse', AuthController.getDemoAccounts);

export default router;
