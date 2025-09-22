import Payment, { IPayment } from '../models/payment';
import User, { IUser } from '../models/user';
import Course from '../models/course';

class PaymentService {
    // Payment gateway integration will be added later
    constructor() {}

    async processPayment(userId: string, courseId: string, amount: number): Promise<IPayment> {
        // Payment gateway integration will be implemented here in the future
        // For now, just create a payment with dummy transactionId and status
        const payment = new Payment({
            userId: userId,
            courseId: courseId,
            amount: amount,
            transactionId: 'dummy-tx',
            status: 'success',
        });
        await payment.save();
        return payment;
    }

    async refundPayment(paymentId: string): Promise<IPayment> {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }
        // Payment gateway refund integration will be added later
        payment.status = 'refunded';
        await payment.save();
        return payment;
    }

    async getPaymentHistory(userId: string): Promise<IPayment[]> {
        return await Payment.find({ userId: userId });
    }
}
export default PaymentService;