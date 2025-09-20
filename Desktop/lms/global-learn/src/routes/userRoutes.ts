import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const userController = new UserController();

// Route to get user profile
router.get('/profile', authMiddleware, userController.getUserProfile);

// Route to update user profile
router.put('/profile', authMiddleware, userController.updateUserProfile);

// Route to get user activity
router.get('/activity', authMiddleware, userController.getUserActivity);

export default router;