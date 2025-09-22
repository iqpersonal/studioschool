import { Request, Response } from 'express';
// import { UserService } from '../services/userService';

import UserService from '../services/userService';

class UserController {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    public async getUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            const userProfile = await this.userService.getUserById(userId);
            res.status(200).json(userProfile);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error fetching user profile', error: errMsg });
        }
    }

    public async updateUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            const updatedData = req.body;
            const updatedProfile = await this.userService.updateUser(userId, updatedData);
            res.status(200).json(updatedProfile);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error updating user profile', error: errMsg });
        }
    }
}
export default UserController;