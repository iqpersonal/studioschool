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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const paymentService_1 = __importDefault(require("../services/paymentService"));
class PaymentController {
    constructor() {
        this.paymentService = new paymentService_1.default();
    }
    processPayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentData = req.body;
                const result = yield this.paymentService.processPayment(paymentData);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: 'Payment processing failed', error });
            }
        });
    }
    getPaymentHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.params.userId;
                const history = yield this.paymentService.getPaymentHistory(userId);
                res.status(200).json(history);
            }
            catch (error) {
                res.status(500).json({ message: 'Failed to retrieve payment history', error });
            }
        });
    }
    refundPayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { paymentId } = req.body;
                const result = yield this.paymentService.refundPayment(paymentId);
                res.status(200).json(result);
            }
            catch (error) {
                res.status(500).json({ message: 'Refund processing failed', error });
            }
        });
    }
}
exports.default = PaymentController;
