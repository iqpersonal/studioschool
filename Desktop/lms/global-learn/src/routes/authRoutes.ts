import { Router } from 'express';
import AuthController from '../controllers/authController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();
const authController = AuthController;

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
// router.get('/profile', authMiddleware, authController.getProfile); // Method not implemented, comment out for now

export default router;