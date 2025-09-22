import { Router } from 'express';
import UserController from '../controllers/userController';
import { UserService } from '../services/userService';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();
const userService = new UserService();
const userController = new UserController(userService);

// Route to get user profile
router.get('/profile', authMiddleware, userController.getUserProfile);

// Route to update user profile
router.put('/profile', authMiddleware, userController.updateUserProfile);

// Route to get user activity
// router.get('/activity', authMiddleware, userController.getUserActivity); // Method not implemented, comment out for now

export default router;