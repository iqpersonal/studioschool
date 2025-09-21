"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentMiddleware = void 0;
const paymentMiddleware = (req, res, next) => {
    const { amount, currency, paymentMethod } = req.body;
    if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({ error: 'Payment details are incomplete.' });
    }
    // Additional validation logic can be added here
    next();
};
exports.paymentMiddleware = paymentMiddleware;
