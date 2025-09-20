import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';

export class DashboardController {
    private dashboardService: DashboardService;

    constructor() {
        this.dashboardService = new DashboardService();
    }

    public async getStudentDashboard(req: Request, res: Response): Promise<void> {
        try {
            const studentId = req.params.id;
            const data = await this.dashboardService.getStudentData(studentId);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving student dashboard data', error });
        }
    }

    public async getParentDashboard(req: Request, res: Response): Promise<void> {
        try {
            const parentId = req.params.id;
            const data = await this.dashboardService.getParentData(parentId);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving parent dashboard data', error });
        }
    }

    public async getInstructorDashboard(req: Request, res: Response): Promise<void> {
        try {
            const instructorId = req.params.id;
            const data = await this.dashboardService.getInstructorData(instructorId);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving instructor dashboard data', error });
        }
    }
}