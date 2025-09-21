"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = __importDefault(require("../controllers/paymentController"));
const paymentMiddleware_1 = require("../middlewares/paymentMiddleware");
const router = (0, express_1.Router)();
const paymentController = new paymentController_1.default();
router.post('/process', paymentMiddleware_1.validatePayment, paymentController.processPayment);
router.get('/history/:userId', paymentController.getPaymentHistory);
exports.default = router;
