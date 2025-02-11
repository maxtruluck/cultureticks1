const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { generateTicketPDF } = require('../utils/ticketGenerator');
const pool = require('../config/db');

// Public routes
router.get('/event/:eventId', ticketController.getTicketsByEvent);

// Download ticket
router.get('/download/:eventId/:ticketType', async (req, res) => {
    try {
        // Get event details
        const eventResult = await pool.query(
            'SELECT title, start_time, location FROM events WHERE id = $1',
            [req.params.eventId]
        );
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventResult.rows[0];
        
        // Generate mock ticket data
        const ticketData = {
            eventId: req.params.eventId,
            eventTitle: event.title,
            eventDate: event.start_time,
            location: event.location,
            ticketType: req.params.ticketType,
            ticketId: `TIX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        };

        // Generate PDF
        const doc = await generateTicketPDF(ticketData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketData.ticketId}.pdf"`);

        // Pipe the PDF to the response
        doc.pipe(res);
        doc.end();

    } catch (error) {
        console.error('Error generating ticket:', error);
        res.status(500).json({ error: 'Failed to generate ticket' });
    }
});

// Protected routes (require authentication)
router.post('/create-batch', ticketController.createTicketBatch);
router.post('/purchase', ticketController.purchaseTicket);
router.post('/refund', ticketController.refundTicket);
router.get('/my-tickets', ticketController.getMyTickets);

module.exports = router;
