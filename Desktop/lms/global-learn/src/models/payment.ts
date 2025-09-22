import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    courseId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['credit_card', 'paypal', 'bank_transfer']
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export interface IPayment extends Document {
    userId: string;
    courseId: string;
    amount: number;
    paymentMethod: string;
    status: string;
    transactionId: string;
    createdAt: Date;
}

const Payment = model<IPayment>('Payment', paymentSchema);
export default Payment;