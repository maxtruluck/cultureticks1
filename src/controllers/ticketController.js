const db = require('../config/db');

exports.getTicketsByEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Get all ticket types and their availability for this event
        const result = await db.query(`
            SELECT 
                ticket_type,
                price::numeric,
                COUNT(*) FILTER (WHERE status = 'available') as available_count
            FROM tickets
            WHERE event_id = $1
            GROUP BY ticket_type, price
            ORDER BY price ASC
        `, [eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No tickets found for this event' });
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting tickets:', error);
        res.status(500).json({ error: 'Failed to get tickets' });
    }
};

exports.purchaseTicket = async (req, res) => {
    const { event_id, ticket_type, quantity } = req.body;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Find available tickets
        const ticketResult = await client.query(`
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

        if (ticketResult.rowCount !== parseInt(quantity)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Not enough tickets available' });
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Tickets purchased successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error purchasing ticket:', error);
        res.status(500).json({ error: 'Failed to purchase ticket' });
    } finally {
        client.release();
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, e.title as event_title, e.start_time, e.location
            FROM tickets t
            JOIN events e ON t.event_id = e.id
            WHERE t.status = 'sold'
            ORDER BY e.start_time ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting purchased tickets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.refundTicket = async (req, res) => {
    const { ticket_id } = req.body;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Check if the ticket exists and is in 'sold' status
        const ticketResult = await client.query(`
            SELECT * FROM tickets
            WHERE id = $1 AND status = 'sold'
            FOR UPDATE
        `, [ticket_id]);

        if (ticketResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Ticket not found or not eligible for refund' });
        }

        // Update the ticket status
        const updateResult = await client.query(`
            UPDATE tickets
            SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [ticket_id]);

        await client.query('COMMIT');
        res.json(updateResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};
