import { Request, Response } from 'express';
import AnalyticsService from '../services/analyticsService';
import Analytics from '../models/analytics';

class AnalyticsController {
    private analyticsService: AnalyticsService;

    constructor() {
        this.analyticsService = new AnalyticsService(Analytics);
    }

    public async getEngagementReport(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId;
            const engagementData = await this.analyticsService.generateEngagementReport(userId);
            res.status(200).json(engagementData);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error retrieving engagement report', error: errMsg });
        }
    }

    public async getPerformanceReport(req: Request, res: Response): Promise<void> {
        try {
            const courseId = req.params.courseId;
            const performanceData = await this.analyticsService.generatePerformanceReport(courseId);
            res.status(200).json(performanceData);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error retrieving performance report', error: errMsg });
        }
    }

    public async getOverallAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const overallData = await this.analyticsService.getOverallAnalytics();
            res.status(200).json(overallData);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error retrieving overall analytics', error: errMsg });
        }
    }
}
export default AnalyticsController;