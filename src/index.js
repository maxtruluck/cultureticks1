const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('./config/config');
const stripe = require('./config/stripe');

const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = config.port || 5173;

// Middleware
app.use(cors());

// Body parsing middleware
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook') {
        next(); // Raw body for Stripe webhook
    } else {
        express.json()(req, res, next); // JSON body parser for everything else
    }
});
app.use(express.urlencoded({ extended: true }));  // For URL-encoded payloads

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payment', paymentRoutes);

// Add Stripe config endpoint
app.get('/api/config/stripe', (req, res) => {
    res.json({ publishableKey: config.stripe.publishableKey });
});

// Serve HTML files
app.get('*.html', (req, res) => {
    // Redirect payment-success.html to purchase-success.html while preserving query parameters
    if (req.path === '/payment-success.html') {
        return res.redirect(301, '/purchase-success.html' + (req.query ? '?' + new URLSearchParams(req.query).toString() : ''));
    }
    res.sendFile(path.join(__dirname, '../public', req.path));
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
