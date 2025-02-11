const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateTicketPDF(ticketData) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });

    // Generate QR code
    const qrCodeData = JSON.stringify({
        eventId: ticketData.eventId,
        ticketType: ticketData.ticketType,
        ticketId: ticketData.ticketId,
        timestamp: new Date().toISOString()
    });
    
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    // Add event title
    doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('CultureTicks', { align: 'center' })
        .moveDown();

    // Add ticket info
    doc.fontSize(20)
        .font('Helvetica-Bold')
        .text(ticketData.eventTitle, { align: 'center' })
        .moveDown();

    doc.fontSize(14)
        .font('Helvetica')
        .text(`Date: ${new Date(ticketData.eventDate).toLocaleDateString()}`, { align: 'center' })
        .text(`Time: ${new Date(ticketData.eventDate).toLocaleTimeString()}`, { align: 'center' })
        .text(`Location: ${ticketData.location}`, { align: 'center' })
        .moveDown();

    doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(`Ticket Type: ${ticketData.ticketType}`, { align: 'center' })
        .moveDown();

    // Add QR code
    doc.image(qrCodeImage, {
        fit: [200, 200],
        align: 'center'
    });

    // Add ticket ID
    doc.moveDown()
        .fontSize(12)
        .font('Helvetica')
        .text(`Ticket ID: ${ticketData.ticketId}`, { align: 'center' })
        .moveDown();

    // Add terms
    doc.fontSize(10)
        .font('Helvetica')
        .text('This ticket is non-transferable and must be presented at the event. CultureTicks is not responsible for lost or stolen tickets.', {
            align: 'center',
            width: 400
        });

    return doc;
}

module.exports = { generateTicketPDF };
