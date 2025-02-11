const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');

exports.createPaymentIntent = async (req, res) => {
    console.log('=== Payment Intent Creation Start ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {
        const { amount, eventId, tickets } = req.body;
        console.log('Extracted values:', { amount, eventId, tickets });

        // Validate required fields
        if (!amount || !eventId || !tickets) {
            console.error('Missing required fields:', { amount, eventId, tickets });
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: {
                    amount: !amount ? 'Amount is required' : undefined,
                    eventId: !eventId ? 'Event ID is required' : undefined,
                    tickets: !tickets ? 'Tickets are required' : undefined
                }
            });
        }

        // Validate amount
        const amountInCents = parseInt(amount);
        console.log('Parsed amount:', amountInCents);
        
        if (isNaN(amountInCents) || amountInCents <= 0) {
            console.error('Invalid amount:', amount);
            return res.status(400).json({ 
                error: 'Invalid amount',
                details: 'Amount must be a positive number'
            });
        }

        const client = await pool.connect();
        let lockedTicketIds = [];
        try {
            await client.query('BEGIN');
            console.log('Started database transaction');

            // Verify ticket availability and lock tickets
            for (const ticket of tickets) {
                console.log('Processing ticket:', ticket);
                
                // Get available tickets of the requested type
                const availableTicketsResult = await client.query(`
                    SELECT id
                    FROM tickets
                    WHERE event_id = $1 
                    AND ticket_type = $2
                    AND status = 'available'
                    FOR UPDATE SKIP LOCKED
                    LIMIT $3
                `, [eventId, ticket.type, ticket.quantity]);

                console.log('Available tickets found:', availableTicketsResult.rows.length);

                if (availableTicketsResult.rows.length < ticket.quantity) {
                    throw new Error(`Not enough tickets available for type: ${ticket.type}`);
                }

                // Store locked ticket IDs
                lockedTicketIds = lockedTicketIds.concat(
                    availableTicketsResult.rows.map(row => row.id)
                );
            }

            console.log('Locked ticket IDs:', lockedTicketIds);

            // Create payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                metadata: {
                    eventId,
                    ticketIds: JSON.stringify(lockedTicketIds)
                }
            });

            console.log('Created payment intent:', paymentIntent.id);

            // Mark tickets as pending
            await client.query(`
                UPDATE tickets 
                SET status = 'pending'
                WHERE id = ANY($1)
            `, [lockedTicketIds]);

            await client.query('COMMIT');
            console.log('Committed transaction');

            res.json({
                clientSecret: paymentIntent.client_secret
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction rolled back:', error);
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Payment intent creation failed:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent',
            details: error.message
        });
    }
};

async function handleSuccessfulPayment(paymentIntent) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const ticketIds = JSON.parse(paymentIntent.metadata.ticketIds);
        
        // Update ticket status to sold
        await client.query(`
            UPDATE tickets 
            SET status = 'sold'
            WHERE id = ANY($1)
        `, [ticketIds]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to process successful payment:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function handleFailedPayment(paymentIntent) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const ticketIds = JSON.parse(paymentIntent.metadata.ticketIds);
        
        // Return tickets to available pool
        await client.query(`
            UPDATE tickets 
            SET status = 'available'
            WHERE id = ANY($1)
        `, [ticketIds]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to process failed payment:', error);
        throw error;
    } finally {
        client.release();
    }
}

exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        switch (event.type) {
            case 'payment_intent.succeeded':
                await handleSuccessfulPayment(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handleFailedPayment(event.data.object);
                break;
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};
