import { Router } from 'express';
import DashboardController from '../controllers/dashboardController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();
const dashboardController = new DashboardController();

// Routes for retrieving dashboard data
router.get('/student', authMiddleware, dashboardController.getStudentDashboard);
router.get('/parent', authMiddleware, dashboardController.getParentDashboard);
router.get('/instructor', authMiddleware, dashboardController.getInstructorDashboard);

export default router;