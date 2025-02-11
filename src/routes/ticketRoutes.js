const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Public routes
router.get('/event/:eventId', ticketController.getTicketsByEvent);

// Protected routes (require authentication)
// Routes for ticket purchasing flow
router.post('/purchase', ticketController.purchaseTicket);
router.post('/refund', ticketController.refundTicket);

module.exports = router;
