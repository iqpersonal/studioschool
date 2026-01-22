import { Router } from 'express';
import AnalyticsController from '../controllers/analyticsController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();
const analyticsController = new AnalyticsController();

router.get('/reports', authMiddleware, analyticsController.getReports);
router.get('/engagement', authMiddleware, analyticsController.getEngagementData);
router.get('/performance', authMiddleware, analyticsController.getPerformanceData);

export default router;