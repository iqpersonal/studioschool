import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';

interface AuthenticatedRequest extends Request {
    user?: any;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied.' });
    }

    jwt.verify(token, process.env.JWT_SECRET as string, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token is not valid.' });
        }

        try {
            if (decoded && typeof decoded === 'object' && 'id' in decoded) {
                const user = await User.findById((decoded as any).id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found.' });
                }

                req.user = user;
                next();
            } else {
                return res.status(401).json({ message: 'Invalid token payload.' });
            }
        } catch (error) {
            return res.status(500).json({ message: 'Server error.' });
        }
    });
};

export default authMiddleware;