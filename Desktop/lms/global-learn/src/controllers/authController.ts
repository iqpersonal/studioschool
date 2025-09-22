import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import authService from '../services/authService';

class AuthController {
    public async signUp(req: Request, res: Response): Promise<Response> {
        const { username, email, password } = req.body;

        try {
            const user = await authService.register({ username, email, password });
            return res.status(201).json({ message: 'User created successfully', user });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            return res.status(500).json({ message: 'Error creating user', error: errMsg });
        }
    }

    public async login(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body;

        try {
            const result = await authService.login(email, password);
            return res.status(200).json({ message: 'Login successful', ...result });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            return res.status(500).json({ message: 'Error logging in', error: errMsg });
        }
    }
}

export default new AuthController();