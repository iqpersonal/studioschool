import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserService } from '../services/authService';

class AuthController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    public async signUp(req: Request, res: Response): Promise<Response> {
        const { username, email, password } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await this.userService.createUser({ username, email, password: hashedPassword });
            return res.status(201).json({ message: 'User created successfully', user });
        } catch (error) {
            return res.status(500).json({ message: 'Error creating user', error });
        }
    }

    public async login(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body;

        try {
            const user = await this.userService.findUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
            return res.status(200).json({ message: 'Login successful', token });
        } catch (error) {
            return res.status(500).json({ message: 'Error logging in', error });
        }
    }

    public async getProfile(req: Request, res: Response): Promise<Response> {
        try {
            // req.user is set by authMiddleware
            const user = (req as any).user;
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            // Return user profile without password
            const { password, ...userProfile } = user.toObject();
            return res.status(200).json({ user: userProfile });
        } catch (error) {
            return res.status(500).json({ message: 'Error retrieving profile', error });
        }
    }
}

export default new AuthController();