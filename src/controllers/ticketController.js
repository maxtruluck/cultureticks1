const db = require('../config/db');

exports.getTicketsByEvent = async (req, res) => {
    const eventId = req.params.eventId;
    try {
        const result = await db.query(`
            SELECT 
                ticket_type,
                price,
                COUNT(*) FILTER (WHERE status = 'available') as available_count
            FROM tickets
            WHERE event_id = $1
            GROUP BY ticket_type, price
            ORDER BY price ASC
        `, [eventId]);
        
        console.log('Tickets found:', result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting tickets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.purchaseTicket = async (req, res) => {
    const { event_id, ticket_type } = req.body;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Find an available ticket
        const ticketResult = await client.query(`
            SELECT id 
            FROM tickets 
            WHERE event_id = $1 
            AND ticket_type = $2 
            AND status = 'available' 
            LIMIT 1
            FOR UPDATE
        `, [event_id, ticket_type]);

        if (ticketResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No tickets available' });
        }

        const ticketId = ticketResult.rows[0].id;

        // Update ticket status to sold
        await client.query(`
            UPDATE tickets 
            SET status = 'sold',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [ticketId]);

        await client.query('COMMIT');
        res.json({ message: 'Ticket purchased successfully', ticketId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error purchasing ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
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

exports.createTicketBatch = async (req, res) => {
    const { event_id, ticket_types } = req.body;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Verify the event exists
        const eventResult = await client.query('SELECT id FROM events WHERE id = $1', [event_id]);
        if (eventResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Event not found' });
        }

        // Create tickets for each ticket type
        const createdTickets = [];
        for (const ticketType of ticket_types) {
            // Generate the specified quantity of tickets for this type
            const values = Array(ticketType.quantity).fill({
                event_id,
                ticket_type: ticketType.type,
                price: ticketType.price,
                status: 'available'
            });

            // Build the multi-value insert query
            const placeholders = values.map((_, index) => {
                const base = index * 4;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
            }).join(', ');

            const flatValues = values.flatMap(v => [
                v.event_id,
                v.ticket_type,
                v.price,
                v.status
            ]);

            const query = `
                INSERT INTO tickets (event_id, ticket_type, price, status)
                VALUES ${placeholders}
                RETURNING id, ticket_type, price, status
            `;

            const result = await client.query(query, flatValues);
            createdTickets.push({
                ticket_type: ticketType.type,
                quantity: result.rowCount,
                price: ticketType.price
            });
        }

        await client.query('COMMIT');
        console.log('Created tickets:', createdTickets);
        res.status(201).json({
            message: 'Tickets created successfully',
            event_id,
            tickets: createdTickets
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating ticket batch:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};
