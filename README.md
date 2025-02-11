# CultureTicks

A modern ticketing platform built with Node.js and Stripe integration.

## Features

- Event browsing and ticket selection
- Secure payment processing with Stripe
- Real-time ticket availability tracking
- Order confirmation and management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
psql -d cultureticks-1.2 -f src/db/migrations/*.sql
```

4. Start the development server:
```bash
npm run dev
```

## Development

- Backend: Node.js with Express
- Database: PostgreSQL
- Payment Processing: Stripe
- Frontend: Vanilla JavaScript with modern ES6+ features

## API Routes

- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `POST /api/payment/create-payment-intent` - Create payment intent
- `POST /api/payment/webhook` - Handle Stripe webhooks

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
