export class PaymentGateway {
    async process(paymentData: any) {
        // Placeholder: simulate payment processing
        return { status: 'success', ...paymentData };
    }
    async refund(paymentId: string) {
        // Placeholder: simulate refund
        return { status: 'refunded', paymentId };
    }
}
