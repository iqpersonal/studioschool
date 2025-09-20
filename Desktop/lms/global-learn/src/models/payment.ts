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

const Payment = model('Payment', paymentSchema);

export default Payment;