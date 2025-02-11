const db = require('../config/db');

exports.getAllEvents = async (req, res) => {
    try {
        // Get query parameters for pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 24;
        const offset = (page - 1) * limit;

        // First query: Get paginated events with basic venue info
        const result = await db.query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.event_type,
                e.start_date,
                e.end_date,
                e.status,
                e.image_url,
                v.name as venue_name,
                v.city as venue_city,
                v.state as venue_state,
                (
                    SELECT MIN(price) 
                    FROM tickets t2 
                    WHERE t2.event_id = e.id AND t2.status = 'available'
                ) as min_price,
                (
                    SELECT COUNT(*) 
                    FROM tickets t3 
                    WHERE t3.event_id = e.id AND t3.status = 'available'
                ) as available_tickets
            FROM events e
            LEFT JOIN venues v ON e.venue_id = v.id
            WHERE e.start_date > NOW() 
                AND e.status = 'upcoming'
            ORDER BY e.start_date ASC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        // Format the response
        const events = result.rows.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            event_type: event.event_type,
            start_date: event.start_date,
            end_date: event.end_date,
            status: event.status,
            image_url: event.image_url,
            venue_name: event.venue_name,
            venue_location: `${event.venue_city}, ${event.venue_state}`,
            ticket_info: {
                starting_price: event.min_price ? `$${event.min_price}` : 'Sold Out',
                available_count: event.available_tickets
            }
        }));

        res.json(events);
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getEventById = async (req, res) => {
    const eventId = req.params.id;
    try {
        console.log('Fetching event with ID:', eventId);

        // First query: Get event and venue details
        const eventResult = await db.query(`
            SELECT 
                e.*,
                v.name as venue_name,
                v.address as venue_address,
                v.city as venue_city,
                v.state as venue_state,
                v.zip as venue_zip,
                v.capacity as venue_capacity
            FROM events e
            LEFT JOIN venues v ON e.venue_id = v.id
            WHERE e.id = $1
        `, [eventId]);

        console.log('Event query result:', eventResult.rows);

        if (eventResult.rows.length === 0) {
            console.log('Event not found');
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventResult.rows[0];

        // Second query: Get ticket types and availability
        const ticketsResult = await db.query(`
            SELECT 
                ticket_type as type,
                price::numeric as price,
                COUNT(*) FILTER (WHERE status = 'available') as available
            FROM tickets
            WHERE event_id = $1
            GROUP BY ticket_type, price
            HAVING COUNT(*) FILTER (WHERE status = 'available') > 0
        `, [eventId]);

        console.log('Tickets found:', ticketsResult.rows);
        
        // Format the response
        const formattedEvent = {
            id: event.id,
            name: event.name,
            description: event.description,
            event_type: event.event_type,
            start_date: event.start_date,
            end_date: event.end_date,
            status: event.status,
            image_url: event.image_url,
            venue: {
                name: event.venue_name,
                address: event.venue_address,
                city: event.venue_city,
                state: event.venue_state,
                zip: event.venue_zip,
                capacity: event.venue_capacity
            },
            tickets: ticketsResult.rows
        };

        console.log('Sending formatted event:', formattedEvent);
        res.json(formattedEvent);
    } catch (error) {
        console.error('Error getting event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createEvent = async (req, res) => {
    const { 
        name, description, event_type, start_date, end_date,
        venue_id, status, image_url 
    } = req.body;

    try {
        const result = await db.query(`
            INSERT INTO events (
                name, description, event_type, start_date, end_date,
                venue_id, status, image_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            name, description, event_type, start_date, end_date,
            venue_id, status || 'upcoming', image_url
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateEvent = async (req, res) => {
    const eventId = req.params.id;
    const { 
        name, description, event_type, start_date, end_date,
        venue_id, status, image_url 
    } = req.body;

    try {
        const result = await db.query(`
            UPDATE events
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                event_type = COALESCE($3, event_type),
                start_date = COALESCE($4, start_date),
                end_date = COALESCE($5, end_date),
                venue_id = COALESCE($6, venue_id),
                status = COALESCE($7, status),
                image_url = COALESCE($8, image_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [
            name, description, event_type, start_date, end_date,
            venue_id, status, image_url, eventId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteEvent = async (req, res) => {
    const eventId = req.params.id;
    try {
        const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [eventId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
