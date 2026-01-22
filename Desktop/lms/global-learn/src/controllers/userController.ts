import { Request, Response } from 'express';
import { UserService } from '../services/userService';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    public async getUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            const userProfile = await this.userService.getUserById(userId);
            res.status(200).json(userProfile);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching user profile', error });
        }
    }

    public async updateUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            const updatedData = req.body;
            const updatedProfile = await this.userService.updateUser(userId, updatedData);
            res.status(200).json(updatedProfile);
        } catch (error) {
            res.status(500).json({ message: 'Error updating user profile', error });
        }
    }

    public async getUserActivity(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            const activity = await this.userService.getUserActivity(userId);
            res.status(200).json(activity);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching user activity', error });
        }
    }
}