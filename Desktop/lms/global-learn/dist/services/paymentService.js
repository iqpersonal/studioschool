"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const payment_1 = require("../models/payment");
const user_1 = require("../models/user");
const course_1 = require("../models/course");
const paymentGateway_1 = require("../utils/paymentGateway"); // Assume this is a utility for handling payment gateway interactions
class PaymentService {
    constructor() {
        this.paymentGateway = new paymentGateway_1.PaymentGateway();
    }
    processPayment(userId, courseId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_1.User.findById(userId);
            const course = yield course_1.Course.findById(courseId);
            if (!user || !course) {
                throw new Error('User or Course not found');
            }
            const paymentResult = yield this.paymentGateway.processPayment(user, course, amount);
            if (!paymentResult.success) {
                throw new Error('Payment processing failed');
            }
            const payment = new payment_1.Payment({
                userId: userId,
                courseId: courseId,
                amount: amount,
                transactionId: paymentResult.transactionId,
                status: paymentResult.status,
            });
            yield payment.save();
            return payment;
        });
    }
    refundPayment(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_1.Payment.findById(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }
            const refundResult = yield this.paymentGateway.refundPayment(payment.transactionId);
            if (!refundResult.success) {
                throw new Error('Refund processing failed');
            }
            payment.status = 'refunded';
            yield payment.save();
            return payment;
        });
    }
    getPaymentHistory(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield payment_1.Payment.find({ userId: userId });
        });
    }
}
exports.PaymentService = PaymentService;
