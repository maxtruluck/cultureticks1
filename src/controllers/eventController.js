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
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

exports.getEventById = async (req, res) => {
    const eventId = req.params.id;
    try {
        console.log('Getting event with ID:', eventId);
        
        // Get event details
        const eventResult = await db.query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.start_date,
                e.end_date,
                e.event_type,
                e.status,
                e.image_url
            FROM events e
            WHERE e.id = $1
        `, [eventId]);

        console.log('Event query result:', eventResult.rows);

        if (eventResult.rows.length === 0) {
            console.log('Event not found');
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventResult.rows[0];

        // Get ticket types and availability
        console.log('Getting tickets for event:', eventId);
        const ticketsResult = await db.query(`
            SELECT 
                ticket_type,
                price::numeric,
                COUNT(*) FILTER (WHERE status = 'available') as available_count
            FROM tickets
            WHERE event_id = $1 AND status = 'available'
            GROUP BY ticket_type, price
            ORDER BY price ASC
        `, [eventId]);

        console.log('Tickets query result:', ticketsResult.rows);

        // Format the response
        const response = {
            ...event,
            tickets: ticketsResult.rows.map(ticket => ({
                ticket_type: ticket.ticket_type,
                price: ticket.price,
                available_count: parseInt(ticket.available_count)
            }))
        };

        console.log('Sending response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error getting event:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

exports.getEventSeating = async (req, res) => {
    try {
        const eventId = req.params.id;
        
        // Get tickets for this event
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

        // Convert ticket data to seating sections
        const sections = result.rows.map(ticket => ({
            id: ticket.ticket_type,
            name: ticket.ticket_type,
            type: 'seated',
            available: ticket.available_count,
            priceLevel: getPriceLevel(ticket.price),
            tickets: [{
                id: ticket.ticket_type,
                price: {
                    total: ticket.price,
                    base: Math.floor(ticket.price * 0.9),
                    fees: Math.ceil(ticket.price * 0.1)
                }
            }],
            // Generate coordinates based on section name
            coordinates: generateSectionPath(ticket.ticket_type)
        }));

        res.json({ sections });
    } catch (error) {
        console.error('Error getting event seating:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Failed to load seating map', details: error.message });
    }
};

// Helper function to generate SVG path for each section
function generateSectionPath(sectionName) {
    const sections = {
        'Orchestra': 'M 300,600 Q 500,600 700,600 L 700,700 Q 500,700 300,700 Z',
        'Mezzanine': 'M 250,400 Q 500,400 750,400 L 750,500 Q 500,500 250,500 Z',
        'Balcony': 'M 200,200 Q 500,200 800,200 L 800,300 Q 500,300 200,300 Z',
        'Left Wing': 'M 100,400 L 200,400 L 200,600 L 100,600 Z',
        'Right Wing': 'M 800,400 L 900,400 L 900,600 L 800,600 Z',
        'VIP Box Left': 'M 250,500 L 350,500 L 350,600 L 250,600 Z',
        'VIP Box Right': 'M 650,500 L 750,500 L 750,600 L 650,600 Z',
        'General': 'M 400,500 L 600,500 L 600,600 L 400,600 Z'
    };
    
    return sections[sectionName] || sections['General'];
}

// Helper function to determine price level (1-5)
function getPriceLevel(price) {
    if (price < 50) return 1;
    if (price < 100) return 2;
    if (price < 150) return 3;
    if (price < 200) return 4;
    return 5;
}
