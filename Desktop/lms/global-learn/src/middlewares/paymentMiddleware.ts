import { Request, Response, NextFunction } from 'express';

export const paymentMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const { amount, currency, paymentMethod } = req.body;

    if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({ error: 'Payment details are incomplete.' });
    }

    // Additional validation logic can be added here

    next();
};