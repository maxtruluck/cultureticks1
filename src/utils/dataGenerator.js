const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cultureticks-1.2',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

const eventTypes = [
    'Concert', 'Festival', 'Theater', 'Comedy', 'Sports',
    'Conference', 'Exhibition', 'Workshop', 'Seminar', 'Gala'
];

const ticketTypes = [
    { name: 'General', basePrice: 49.99 },
    { name: 'VIP', basePrice: 149.99 },
    { name: 'Premium', basePrice: 249.99 }
];

async function generateVenues(count) {
    console.log(`Generating ${count} venues...`);
    const venues = [];
    
    for (let i = 0; i < count; i++) {
        const venue = {
            name: `${faker.company.name()} ${faker.helpers.arrayElement(['Arena', 'Theater', 'Stadium', 'Hall', 'Center'])}`,
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state({ abbreviated: true }),
            zip: faker.location.zipCode(),
            capacity: faker.number.int({ min: 1000, max: 50000 }),
            description: faker.company.catchPhrase()
        };

        const result = await pool.query(`
            INSERT INTO venues (name, address, city, state, zip, capacity, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [venue.name, venue.address, venue.city, venue.state, venue.zip, venue.capacity, venue.description]);

        venues.push({ ...venue, id: result.rows[0].id });
        console.log(`Created venue: ${venue.name}`);
    }

    return venues;
}

async function generateEvents(venues, count) {
    console.log(`Generating ${count} events...`);
    const events = [];

    for (let i = 0; i < count; i++) {
        const venue = faker.helpers.arrayElement(venues);
        const eventType = faker.helpers.arrayElement(eventTypes);
        const startDate = faker.date.future();
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + faker.number.int({ min: 2, max: 8 }));

        const event = {
            name: `${faker.company.buzzPhrase()} ${eventType}`,
            description: faker.lorem.paragraph(),
            event_type: eventType,
            start_date: startDate,
            end_date: endDate,
            venue_id: venue.id,
            status: 'upcoming',
            organizer_id: 1, // Assuming we have at least one organizer
            image_url: faker.image.urlPicsumPhotos()
        };

        const result = await pool.query(`
            INSERT INTO events (
                name, description, event_type, start_date, end_date,
                venue_id, status, organizer_id, image_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            event.name, event.description, event.event_type,
            event.start_date, event.end_date, event.venue_id,
            event.status, event.organizer_id, event.image_url
        ]);

        const eventId = result.rows[0].id;
        await generateTickets(eventId, venue.capacity);

        events.push({ ...event, id: eventId });
        console.log(`Created event: ${event.name}`);
    }

    return events;
}

async function generateTickets(eventId, venueCapacity) {
    // Distribute capacity among ticket types
    const totalTickets = venueCapacity;
    const generalShare = Math.floor(totalTickets * 0.7); // 70% General
    const vipShare = Math.floor(totalTickets * 0.2); // 20% VIP
    const premiumShare = Math.floor(totalTickets * 0.1); // 10% Premium

    const distribution = [
        { type: 'General', count: generalShare, price: ticketTypes[0].basePrice },
        { type: 'VIP', count: vipShare, price: ticketTypes[1].basePrice },
        { type: 'Premium', count: premiumShare, price: ticketTypes[2].basePrice }
    ];

    for (const ticketType of distribution) {
        // Generate tickets in smaller batches to avoid memory issues
        const batchSize = 1000;
        const batches = Math.ceil(ticketType.count / batchSize);

        for (let i = 0; i < batches; i++) {
            const currentBatchSize = Math.min(batchSize, ticketType.count - (i * batchSize));
            const values = Array(currentBatchSize).fill(0).map(() => 
                `(${eventId}, '${ticketType.type}', ${ticketType.price}, 'available')`
            ).join(',');

            await pool.query(`
                INSERT INTO tickets (event_id, ticket_type, price, status)
                VALUES ${values}
            `);
        }

        console.log(`Created ${ticketType.count} ${ticketType.type} tickets for event ${eventId}`);
    }
}

async function main() {
    try {
        console.log('Starting data generation...');
        
        // Generate venues first
        const venues = await generateVenues(25);
        console.log(`Successfully created ${venues.length} venues`);

        // Then generate events using those venues
        const events = await generateEvents(venues, 500);
        console.log(`Successfully created ${events.length} events`);

        console.log('Data generation completed successfully!');
    } catch (error) {
        console.error('Error generating data:', error);
    } finally {
        await pool.end();
    }
}

// Run the generator
main();
