import { Router } from 'express';
import authController from '../controllers/authController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.getProfile);

export default router;