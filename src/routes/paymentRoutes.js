const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create payment intent
router.post('/create-payment-intent', paymentController.createPaymentIntent);

// Stripe webhook - use raw body parser
router.post(
    '/webhook', 
    express.raw({ type: 'application/json' }), 
    paymentController.handleWebhook
);

module.exports = router;
