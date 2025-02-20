import crypto from 'crypto';

export const razorpayWebhook = (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];
        const rawBody = req.body.toString(); // Convert to string

        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (signature !== generatedSignature) {
            console.log('Invalid signature');
            return res.status(400).send('Invalid signature');
        }

        console.log('Signature verified');
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
