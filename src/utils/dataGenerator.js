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
    'Dance', 'Classical Music', 'Museums', 'Opera', 'Theater'
];

const eventDescriptions = {
    'Dance': [
        'Contemporary Dance Performance',
        'Ballet Production',
        'Modern Dance Showcase',
        'International Dance Festival',
        'Dance Company Performance'
    ],
    'Classical Music': [
        'Symphony Orchestra Concert',
        'Chamber Music Performance',
        'Philharmonic Orchestra',
        'Classical Piano Recital',
        'String Quartet Performance'
    ],
    'Museums': [
        'Art Exhibition Opening',
        'Museum After Hours',
        'Special Collection Showcase',
        'Curator\'s Tour',
        'Interactive Exhibition'
    ],
    'Opera': [
        'Grand Opera Performance',
        'Opera Gala',
        'Contemporary Opera Premiere',
        'Opera Festival',
        'Classical Opera Production'
    ],
    'Theater': [
        'Broadway Musical',
        'Classical Theater Production',
        'Contemporary Play',
        'Theater Festival',
        'Experimental Theater'
    ]
};

const venueTypes = {
    'Dance': ['Dance Theater', 'Performance Hall', 'Cultural Center'],
    'Classical Music': ['Concert Hall', 'Symphony Hall', 'Recital Hall'],
    'Museums': ['Art Museum', 'Cultural Museum', 'Gallery'],
    'Opera': ['Opera House', 'Grand Theater', 'Performance Center'],
    'Theater': ['Playhouse', 'Theater', 'Arts Center']
};

const ticketTypes = [
    { name: 'Orchestra', basePrice: 129.99 },
    { name: 'Mezzanine', basePrice: 89.99 },
    { name: 'Balcony', basePrice: 59.99 }
];

async function generateVenues(count) {
    console.log(`Generating ${count} venues...`);
    const venues = [];
    
    for (let i = 0; i < count; i++) {
        const eventType = faker.helpers.arrayElement(eventTypes);
        const venueType = faker.helpers.arrayElement(venueTypes[eventType]);
        
        const venue = {
            name: `${faker.location.city()} ${venueType}`,
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state({ abbreviated: true }),
            zip: faker.location.zipCode(),
            capacity: faker.number.int({ min: 500, max: 3000 }),
            description: `A premier ${venueType.toLowerCase()} showcasing the finest in ${eventType.toLowerCase()}`
        };

        const result = await pool.query(`
            INSERT INTO venues (name, address, city, state, zip, capacity, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [venue.name, venue.address, venue.city, venue.state, venue.zip, venue.capacity, venue.description]);

        venues.push({ ...venue, id: result.rows[0].id, primaryType: eventType });
        console.log(`Created venue: ${venue.name}`);
    }

    return venues;
}

async function generateEvents(venues, count) {
    console.log(`Generating ${count} events...`);
    const events = [];

    for (let i = 0; i < count; i++) {
        const venue = faker.helpers.arrayElement(venues);
        const eventType = venue.primaryType; // Use the venue's primary type
        const eventName = faker.helpers.arrayElement(eventDescriptions[eventType]);
        
        const startDate = faker.date.future();
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3); // Most cultural events are ~3 hours

        const event = {
            name: eventName,
            description: `Experience ${eventName} at the renowned ${venue.name}. ${faker.lorem.paragraph()}`,
            event_type: eventType,
            start_date: startDate,
            end_date: endDate,
            venue_id: venue.id,
            status: 'upcoming',
            organizer_id: 1,
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
    const orchestraShare = Math.floor(totalTickets * 0.3); // 30% Orchestra
    const mezzanineShare = Math.floor(totalTickets * 0.4); // 40% Mezzanine
    const balconyShare = Math.floor(totalTickets * 0.3); // 30% Balcony

    const distribution = [
        { type: 'Orchestra', count: orchestraShare, price: ticketTypes[0].basePrice },
        { type: 'Mezzanine', count: mezzanineShare, price: ticketTypes[1].basePrice },
        { type: 'Balcony', count: balconyShare, price: ticketTypes[2].basePrice }
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
