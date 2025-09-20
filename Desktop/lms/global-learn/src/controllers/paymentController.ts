import { Request, Response } from 'express';
import PaymentService from '../services/paymentService';

class PaymentController {
    private paymentService: PaymentService;

    constructor() {
        this.paymentService = new PaymentService();
    }

    public async processPayment(req: Request, res: Response): Promise<void> {
        try {
            const paymentData = req.body;
            const result = await this.paymentService.processPayment(paymentData);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: 'Payment processing failed', error });
        }
    }

    public async getPaymentHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.userId;
            const history = await this.paymentService.getPaymentHistory(userId);
            res.status(200).json(history);
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve payment history', error });
        }
    }

    public async refundPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.body;
            const result = await this.paymentService.refundPayment(paymentId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: 'Refund processing failed', error });
        }
    }
}

export default PaymentController;