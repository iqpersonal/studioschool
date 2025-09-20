import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';

export class AnalyticsController {
    private analyticsService: AnalyticsService;

    constructor() {
        this.analyticsService = new AnalyticsService();
    }

    public async getStudentEngagement(req: Request, res: Response): Promise<void> {
        try {
            const engagementData = await this.analyticsService.getStudentEngagement();
            res.status(200).json(engagementData);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving student engagement data', error });
        }
    }

    public async getPerformanceReports(req: Request, res: Response): Promise<void> {
        try {
            const performanceData = await this.analyticsService.getPerformanceReports();
            res.status(200).json(performanceData);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving performance reports', error });
        }
    }

    public async getCourseAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const courseId = req.params.id;
            const courseAnalytics = await this.analyticsService.getCourseAnalytics(courseId);
            res.status(200).json(courseAnalytics);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving course analytics', error });
        }
    }
}