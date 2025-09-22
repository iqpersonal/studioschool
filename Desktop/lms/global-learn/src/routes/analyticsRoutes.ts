import { Router } from 'express';
import AnalyticsController from '../controllers/analyticsController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();
const analyticsController = new AnalyticsController();

router.get('/engagement/:userId', authMiddleware, analyticsController.getEngagementReport);
router.get('/performance/:courseId', authMiddleware, analyticsController.getPerformanceReport);
router.get('/overall', authMiddleware, analyticsController.getOverallAnalytics);

export default router;