const express = require('express');
const router = express.Router();
const config = require('../config/config');

console.log('Loading Stripe with secret key:', config.stripe?.secretKey?.slice(0, 8) + '...');
const stripe = require('stripe')(config.stripe.secretKey);

// Get Stripe publishable key
router.get('/config/stripe', (req, res) => {
    try {
        if (!config.stripe?.publishableKey) {
            throw new Error('Stripe publishable key not configured');
        }
        res.json({
            publishableKey: config.stripe.publishableKey
        });
    } catch (error) {
        console.error('Error getting Stripe config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Stripe configuration'
        });
    }
});

// Process payment
router.post('/process', async (req, res) => {
    try {
        console.log('Payment request received:', {
            ...req.body,
            token: req.body.token ? 'present' : 'missing'
        });

        const { token, amount, event_id, tickets } = req.body;

        if (!token || !amount || !event_id || !tickets) {
            console.log('Missing required fields:', {
                hasToken: !!token,
                hasAmount: !!amount,
                hasEventId: !!event_id,
                hasTickets: !!tickets
            });
            return res.status(400).json({
                success: false,
                error: 'Missing required payment information'
            });
        }

        console.log('Creating Stripe charge for amount:', amount);
        
        // Create a charge using Stripe
        const charge = await stripe.charges.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            source: token,
            description: `Ticket purchase for event ${event_id}`
        });

        console.log('Stripe charge result:', {
            id: charge.id,
            status: charge.status,
            amount: charge.amount
        });

        if (charge.status === 'succeeded') {
            // Update ticket status to sold
            const db = require('../config/db');
            const client = await db.pool.connect();
            try {
                await client.query('BEGIN');

                for (const [ticket_type, quantity] of Object.entries(tickets)) {
                    const result = await client.query(`
                        UPDATE tickets 
                        SET status = 'sold'
                        WHERE id IN (
                            SELECT id 
                            FROM tickets 
                            WHERE event_id = $1 
                            AND ticket_type = $2 
                            AND status = 'available' 
                            LIMIT $3
                        )
                        RETURNING id
                    `, [event_id, ticket_type, quantity]);

                    if (result.rowCount !== parseInt(quantity)) {
                        throw new Error('Not enough tickets available');
                    }
                }

                await client.query('COMMIT');
                res.json({
                    success: true,
                    message: 'Payment processed successfully',
                    charge: {
                        id: charge.id,
                        amount: charge.amount
                    }
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } else {
            throw new Error('Payment failed');
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Payment processing failed'
        });
    }
});

module.exports = router;
