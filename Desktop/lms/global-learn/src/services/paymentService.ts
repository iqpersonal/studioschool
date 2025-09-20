import { Payment } from '../models/payment';
import { User } from '../models/user';
import { Course } from '../models/course';
import { PaymentGateway } from '../utils/paymentGateway'; // Assume this is a utility for handling payment gateway interactions

export class PaymentService {
    private paymentGateway: PaymentGateway;

    constructor() {
        this.paymentGateway = new PaymentGateway();
    }

    async processPayment(userId: string, courseId: string, amount: number): Promise<Payment> {
        const user = await User.findById(userId);
        const course = await Course.findById(courseId);

        if (!user || !course) {
            throw new Error('User or Course not found');
        }

        const paymentResult = await this.paymentGateway.processPayment(user, course, amount);

        if (!paymentResult.success) {
            throw new Error('Payment processing failed');
        }

        const payment = new Payment({
            userId: userId,
            courseId: courseId,
            amount: amount,
            transactionId: paymentResult.transactionId,
            status: paymentResult.status,
        });

        await payment.save();
        return payment;
    }

    async refundPayment(paymentId: string): Promise<Payment> {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            throw new Error('Payment not found');
        }

        const refundResult = await this.paymentGateway.refundPayment(payment.transactionId);

        if (!refundResult.success) {
            throw new Error('Refund processing failed');
        }

        payment.status = 'refunded';
        await payment.save();
        return payment;
    }

    async getPaymentHistory(userId: string): Promise<Payment[]> {
        return await Payment.find({ userId: userId });
    }
}