import { Router } from 'express';
import dashboardController from '../controllers/dashboardController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

// Routes for retrieving dashboard data
router.get('/student', authMiddleware, dashboardController.getStudentDashboard);
router.get('/parent', authMiddleware, dashboardController.getParentDashboard);
router.get('/instructor', authMiddleware, dashboardController.getInstructorDashboard);

export default router;