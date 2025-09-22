import { Router } from 'express';
import PaymentController from '../controllers/paymentController';
import { paymentMiddleware } from '../middlewares/paymentMiddleware';

const router = Router();
const paymentController = new PaymentController();

router.post('/process', paymentMiddleware, paymentController.processPayment);
router.get('/history/:userId', paymentController.getPaymentHistory);

export default router;