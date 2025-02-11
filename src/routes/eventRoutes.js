const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Protected routes (require authentication)
router.post('/', authMiddleware.authenticate, eventController.createEvent);
router.put('/:id', authMiddleware.authenticate, eventController.updateEvent);
router.delete('/:id', authMiddleware.authenticate, eventController.deleteEvent);

module.exports = router;
