// backend/utils/generateInvoicePDF.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoicePDF(invoice, customer, vehicle, serviceJob) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `invoice-${invoice.id.slice(0, 8)}.pdf`;
      const filepath = path.join(__dirname, '../../tmp', filename);
      
      // Ensure tmp directory exists
      const tmpDir = path.join(__dirname, '../../tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ============================================
      // HEADER
      // ============================================
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('WORKSHOP', { align: 'center' })
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#666')
        .text('Premium Vehicle Service', { align: 'center' })
        .moveDown(0.5);

      // Divider line
      doc
        .strokeColor('#e0e0e0')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(0.5);

      // ============================================
      // INVOICE TITLE
      // ============================================
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('INVOICE', { align: 'center' })
        .moveDown(0.5);

      // Invoice details
      const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#333')
        .text(`Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}`, 50, doc.y)
        .text(`Date: ${invoiceDate}`, 400, doc.y - 16)
        .text(`Status: ${invoice.status.toUpperCase()}`, 400, doc.y)
        .moveDown(1);

      // ============================================
      // BILL TO SECTION
      // ============================================
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('Bill To:', 50, doc.y)
        .moveDown(0.3);

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#333')
        .text(customer.full_name, 50, doc.y)
        .text(customer.mobile, 50, doc.y + 16)
        .text(customer.email || 'No email', 50, doc.y + 32)
        .moveDown(2);

      // ============================================
      // VEHICLE DETAILS
      // ============================================
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('Vehicle Details:', 50, doc.y)
        .moveDown(0.3);

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#333')
        .text(`Model: ${vehicle.model}`, 50, doc.y)
        .text(`Registration: ${vehicle.registration}`, 50, doc.y + 16)
        .text(`Type: ${vehicle.type || 'N/A'}`, 50, doc.y + 32)
        .moveDown(2);

      // ============================================
      // SERVICE DETAILS TABLE
      // ============================================
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [250, 150, 150];

      // Table Header
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#ffffff');

      // Header background
      doc
        .fillColor('#1a1a2e')
        .rect(tableLeft, tableTop, 500, 25)
        .fill();

      // Header text (white)
      doc
        .fillColor('#ffffff')
        .text('Description', tableLeft + 10, tableTop + 6)
        .text('Qty', tableLeft + 250, tableTop + 6)
        .text('Amount (₹)', tableLeft + 380, tableTop + 6)
        .moveDown(0.5);

      // Service details
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#333');

      const serviceName = serviceJob?.problem || serviceJob?.diagnosis || 'Service';
      const totalAmount = invoice.total_cost || 0;

      // Service row
      let rowY = tableTop + 40;
      doc
        .text(serviceName.substring(0, 40), tableLeft + 10, rowY)
        .text('1', tableLeft + 250, rowY)
        .text(totalAmount.toLocaleString(), tableLeft + 380, rowY);

      // Service breakdown (if available)
      if (invoice.parts_cost || invoice.labour_cost || invoice.diagnostics_cost) {
        rowY += 30;
        doc
          .fontSize(10)
          .fillColor('#666');

        if (invoice.parts_cost) {
          doc
            .text(`  - Parts: ₹${invoice.parts_cost.toLocaleString()}`, tableLeft + 10, rowY);
          rowY += 18;
        }
        if (invoice.labour_cost) {
          doc
            .text(`  - Labour: ₹${invoice.labour_cost.toLocaleString()}`, tableLeft + 10, rowY);
          rowY += 18;
        }
        if (invoice.diagnostics_cost) {
          doc
            .text(`  - Diagnostics: ₹${invoice.diagnostics_cost.toLocaleString()}`, tableLeft + 10, rowY);
          rowY += 18;
        }
        rowY += 10;
      }

      // ============================================
      // TOTAL SECTION
      // ============================================
      const totalTop = Math.max(rowY + 20, tableTop + 160);
      
      doc
        .strokeColor('#e0e0e0')
        .lineWidth(1)
        .moveTo(tableLeft, totalTop)
        .lineTo(tableLeft + 500, totalTop)
        .stroke();

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('Total Amount:', 350, totalTop + 10);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#e94560')
        .text(`₹${totalAmount.toLocaleString()}`, 400, totalTop + 32);

      // ============================================
      // PAYMENT STATUS
      // ============================================
      const statusY = totalTop + 70;
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#333')
        .text('Payment Status:', 50, statusY);

      const statusColor = invoice.status === 'paid' ? '#28a745' : '#dc3545';
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(statusColor)
        .text(invoice.status.toUpperCase(), 170, statusY);

      if (invoice.payment_mode) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666')
          .text(`Payment Mode: ${invoice.payment_mode.toUpperCase()}`, 50, statusY + 25);
      }

      if (invoice.paid_at) {
        const paidDate = new Date(invoice.paid_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666')
          .text(`Paid On: ${paidDate}`, 50, statusY + 45);
      }

      // ============================================
      // FOOTER
      // ============================================
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#999')
        .text(
          'Thank you for choosing our workshop!',
          50,
          750,
          { align: 'center' }
        )
        .text(
          'For any queries, please contact us.',
          50,
          770,
          { align: 'center' }
        );

      // ============================================
      // FINALIZE
      // ============================================
      doc.end();

      stream.on('finish', () => {
        resolve({
          filepath: filepath,
          filename: filename
        });
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generateInvoicePDF;