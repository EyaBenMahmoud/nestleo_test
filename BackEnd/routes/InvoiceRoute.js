const express = require('express');
const router = express.Router();
const Invoice = require('../Models/Invoice');
const User = require('../Models/User');
const Building = require('../Models/Building');
const stripe = require('../Config/stripe');
const { sendInvoiceEmail, sendPaymentConfirmationEmail, generateAndSaveInvoicePDF } = require('../Utils/Email');
const Currency = require('../Models/Currency');
const RecurringInvoice = require('../Models/ScheduledInvoices');
const Bloc = require('../Models/Bloc');
const Apartment = require('../Models/Appartement');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { calculateNextRunDate, scheduleRecurringInvoice } = require('../Controllers/ScheduledInvoiceController');
const { default: mongoose } = require('mongoose');
const invoiceController = require('../Controllers/InvoiceController');
const { protect } = require('../Middlewares/AuthMiddleware');
const multer = require('multer');
const PDFDocument = require('pdfkit');

//////////////////***************************************************/////////////////////////////****************/ */ */
//////////////////****************************************/////////////////////////////****************/ */ */
//////////////////***************** Scheduled Invoices**************/////////////////////////////****************/ */ */
//////////////////******************                  ********************/////////////////////////////****************/ */ */
//////////////////***************************************************/////////////////////////////****************/ */ */
// Create new recurring invoice


// Add this route to generate PDF previews for scheduled invoices



router.post('/scheduled-invoices/preview-pdf', protect, async (req, res) => {
  try {
    const { invoiceId } = req.body;

    // Fetch the scheduled invoice with all related data
    const scheduledInvoice = await RecurringInvoice.findById(invoiceId)
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy');

    if (!scheduledInvoice) {
      return res.status(404).json({ error: 'Scheduled invoice not found' });
    }

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scheduled-invoice-${scheduledInvoice.name}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    generateScheduledInvoicePDF(doc, scheduledInvoice);
    
    // Finalize the PDF and end the stream
    doc.end();
    
  } catch (error) {
    console.error('Error generating scheduled invoice PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF preview' });
  }
});

// Replace the generateScheduledInvoicePDF function with this corrected version

function generateScheduledInvoicePDF(doc, invoice) {
  try {
    const currencySymbol = invoice.currency?.symbol || '€';
    const items = invoice.items || [];

    // Document setup
    doc.font('Helvetica');
    
    // Color scheme
    const primaryColor = '#4f46e5'; // Indigo
    const secondaryColor = '#6366f1'; // Lighter indigo
    const lightGray = '#f3f4f6';
    
    // Header with logo and title
    doc.rect(0, 0, doc.page.width, 100).fill('#f9fafb');
    doc.fontSize(28).fillColor(primaryColor).text('NESTLEO', 50, 40);
    doc.fontSize(14).fillColor('#6b7280').text('Scheduled Invoice Template', 50, 70);
    
    // Invoice information box - use rounded rectangle helper function
    drawRoundedRect(doc, 400, 30, 150, 50, 5, lightGray);
    doc.fillColor('#000').fontSize(12).text('INVOICE ID:', 410, 40);
    doc.fillColor(primaryColor).fontSize(12).text(invoice._id.toString().substring(0, 10), 480, 40);
    doc.fillColor('#000').fontSize(12).text('Created:', 410, 60);
    doc.fillColor(primaryColor).fontSize(12).text(new Date(invoice.createdAt).toLocaleDateString(), 480, 60);
    
    // Main content area
    const yStart = 120;
    let y = yStart;
    
    // Title
    doc.fontSize(18).fillColor(primaryColor).text(invoice.name, 50, y);
    y += 30;
    
    // Template Details
    drawRoundedRect(doc, 50, y, doc.page.width - 100, 110, 5, lightGray);
    doc.fillColor('#374151').fontSize(14).text('Invoice Details', 70, y + 15);
    doc.strokeColor('#e5e7eb').moveTo(70, y + 35).lineTo(doc.page.width - 70, y + 35).stroke();
    
    // Two-column layout for details
    doc.fontSize(10).fillColor('#4b5563');
    doc.text('Building:', 70, y + 45);
    doc.text('Frequency:', 70, y + 65);
    doc.text('Next Generation:', 70, y + 85);
    
    doc.text('Tax Rate:', 300, y + 45);
    doc.text('Status:', 300, y + 65);
    doc.text('Currency:', 300, y + 85);
    
    doc.fontSize(10).fillColor('#000');
    doc.text(invoice.building?.name || 'All buildings', 150, y + 45);
    doc.text(invoice.frequency.charAt(0).toUpperCase() + invoice.frequency.slice(1), 150, y + 65);
    doc.text(new Date(invoice.nextRun).toLocaleDateString(), 150, y + 85);
    
    doc.text(`${(invoice.taxRate * 100).toFixed(1)}%`, 380, y + 45);
    doc.text(invoice.active ? 'Active' : 'Inactive', 380, y + 65);
    doc.text(invoice.currency?.name || invoice.currency?.code || 'EUR', 380, y + 85);
    
    y += 130;
    
    // Recipients section
    drawRoundedRect(doc, 50, y, doc.page.width - 100, 80, 5, lightGray);
    doc.fillColor('#374151').fontSize(14).text('Recipients', 70, y + 15);
    doc.strokeColor('#e5e7eb').moveTo(70, y + 35).lineTo(doc.page.width - 70, y + 35).stroke();
    
    doc.fontSize(10).fillColor('#000');
    if (!invoice.selectedBlocs || !invoice.selectedApartments || 
        (invoice.selectedBlocs.length === 0 && invoice.selectedApartments.length === 0)) {
      doc.text('All apartments in the building will receive this invoice', 70, y + 45);
    } else {
      let recipientText = '';
      
      if (invoice.selectedBlocs && invoice.selectedBlocs.length > 0) {
        recipientText += `Selected Blocs (${invoice.selectedBlocs.length}): `;
        recipientText += invoice.selectedBlocs.map(bloc => bloc.name || bloc.number).join(', ');
      }
      
      if (invoice.selectedApartments && invoice.selectedApartments.length > 0) {
        if (recipientText) recipientText += '\n\n';
        recipientText += `Selected Apartments (${invoice.selectedApartments.length}): `;
        recipientText += invoice.selectedApartments.map(apt => apt.number).join(', ');
      }
      
      doc.text(recipientText, 70, y + 45);
    }
    
    y += 100;
    
    // Items section with table - using filled rectangle instead of rounded
    doc.rect(50, y, doc.page.width - 100, 30).fill(primaryColor);
    doc.fillColor('#fff').fontSize(14).text('Invoice Items', 70, y + 10);
    
    // Table header
    y += 40;
    doc.fillColor(primaryColor).fontSize(10).text('Description', 70, y);
    doc.text('Amount', doc.page.width - 120, y, { align: 'right' });
    
    // Separator line
    y += 20;
    doc.strokeColor('#e5e7eb').moveTo(70, y).lineTo(doc.page.width - 70, y).stroke();
    
    // Table rows
    let subtotal = 0;
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        const amount = Number(item.amount) || 0;
        subtotal += amount;
        
        y += 20;
        doc.fillColor('#000').fontSize(10);
        
        // Alternate row background for better readability
        if (index % 2 === 0) {
          doc.rect(50, y - 10, doc.page.width - 100, 20).fill('#f9fafb');
        }
        
        doc.fillColor('#000');
        doc.text(item.description, 70, y);
        doc.text(`${currencySymbol} ${amount.toFixed(2)}`, doc.page.width - 120, y, { align: 'right' });
      });
    } else {
      // If no items, show a message
      y += 20;
      doc.fillColor('#6b7280').fontSize(10).text('No items have been added to this invoice.', 70, y);
    }
    
    // Totals section
    const tax = subtotal * invoice.taxRate;
    const total = subtotal + tax;
    
    y += 40;
    drawRoundedRect(doc, doc.page.width - 250, y, 180, 80, 5, lightGray);
    
    doc.fillColor('#4b5563').fontSize(10).text('Subtotal:', doc.page.width - 230, y + 15);
    doc.text(`Tax (${(invoice.taxRate * 100).toFixed(1)}%):`, doc.page.width - 230, y + 35);
    doc.fillColor(primaryColor).fontSize(12).text('Total:', doc.page.width - 230, y + 55);
    
    doc.fillColor('#000').fontSize(10).text(
      `${currencySymbol} ${subtotal.toFixed(2)}`, 
      doc.page.width - 120, y + 15, 
      { align: 'right' }
    );
    doc.text(
      `${currencySymbol} ${tax.toFixed(2)}`, 
      doc.page.width - 120, y + 35, 
      { align: 'right' }
    );
    doc.fillColor(primaryColor).fontSize(12).text(
      `${currencySymbol} ${total.toFixed(2)}`, 
      doc.page.width - 120, y + 55, 
      { align: 'right' }
    );
    

  } catch (err) {
    console.error('Error generating PDF:', err);
    doc.fontSize(12).fillColor('red').text('Error generating preview: ' + err.message, 50, 50);
  }
}

// Helper function to draw rounded rectangles
function drawRoundedRect(doc, x, y, width, height, radius, fillColor) {
  // Make sure the radius isn't too large for the rectangle
  const maxRadius = Math.min(width / 2, height / 2);
  radius = Math.min(radius, maxRadius);
  
  doc.save()
    .fillColor(fillColor || '#ffffff');
  
  // Start from top-left corner and draw clockwise
  doc.moveTo(x + radius, y)
    .lineTo(x + width - radius, y)
    .arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0)
    .lineTo(x + width, y + height - radius)
    .arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2)
    .lineTo(x + radius, y + height)
    .arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI)
    .lineTo(x, y + radius)
    .arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2)
    .fill()
    .restore();
}
router.post('/CreateNewScueduledInvoice', async (req, res) => {
  try {
    const {
      name,
      buildingId,
      blocIds,
      apartmentIds,
      items,
      frequency,
      taxRate,
      currencyId,
      createdById
    } = req.body;

    // Validate input
    if (!name || !buildingId || !items || !frequency || !currencyId || !createdById) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate frequency
    const validFrequencies = ['monthly', 'quarterly', 'biannually', 'annually'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    // Calculate next run date
    const nextRun = calculateNextRunDate(frequency);

    // Get currency
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    // Create recurring invoice
    const recurringInvoice = new RecurringInvoice({
      name,
      building: buildingId,
      selectedBlocs: blocIds || [],
      selectedApartments: apartmentIds || [],
      items,
      frequency,
      nextRun,
      createdBy: createdById,
      taxRate,
      currency: currencyId
    });

    await recurringInvoice.save();

    // Schedule the job
    scheduleRecurringInvoice(recurringInvoice._id.toString());

    res.status(201).json(recurringInvoice);

  } catch (error) {
    console.error('Error creating recurring invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get all scheduled invoices
router.get('/scheduled-invoices', async (req, res) => {
  try {
    const invoices = await RecurringInvoice.find()
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy');

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching scheduled invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single scheduled invoice
router.get('/scheduled-invoices/:id', async (req, res) => {
  try {
    const invoice = await RecurringInvoice.findById(req.params.id)
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy')
      .populate('items');

    if (!invoice) {
      return res.status(404).json({ error: 'Scheduled invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching scheduled invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a scheduled invoice
router.put('/scheduled-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      buildingId,
      blocIds = [],
      apartmentIds = [],
      items,
      frequency,
      taxRate,
      currencyId,
      createdById
    } = req.body;

    // Validate required fields
    if (!name || !buildingId || !items || !frequency || !currencyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate new nextRun if frequency changed
    const updateData = {
      name,
      building: buildingId,
      items,
      frequency,
      taxRate,
      currency: currencyId,
      createdBy: createdById,
      nextRun: calculateNextRunDate(frequency),
      lastRun: new Date() // Reset last run since we're updating
    };

    // Handle bloc and apartment selections
    if (blocIds.length > 0) {
      updateData.selectedBlocs = blocIds;
    } else {
      updateData.selectedBlocs = [];
    }

    if (apartmentIds.length > 0) {
      updateData.selectedApartments = apartmentIds;
    } else {
      updateData.selectedApartments = [];
    }

    // Update the invoice
    const updatedInvoice = await RecurringInvoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy');

    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Scheduled invoice not found' });
    }

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating scheduled invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// Delete a scheduled invoice
router.delete('/scheduled-invoices/:id', async (req, res) => {
  try {
    const deletedInvoice = await RecurringInvoice.findByIdAndDelete(req.params.id);

    if (!deletedInvoice) {
      return res.status(404).json({ error: 'Scheduled invoice not found' });
    }

    // TODO: You might want to cancel the cron job here

    res.json({ message: 'Scheduled invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle active status (stop/start)
router.patch('/scheduled-invoices/:id/toggle-active', async (req, res) => {
  try {
    const invoice = await RecurringInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Scheduled invoice not found' });
    }

    invoice.active = !invoice.active;
    await invoice.save();

    res.json({
      message: `Scheduled invoice ${invoice.active ? 'activated' : 'deactivated'}`,
      active: invoice.active
    });
  } catch (error) {
    console.error('Error toggling scheduled invoice status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



//////////////////*******************************/////////////////////////////****************/ */ */
//////////////////*******************************/////////////////////////////****************/ */ */
//////////////////*******************************/////////////////////////////****************/ */ */
//////////////////*******************************/////////////////////////////****************/ */ */
// Currency routes

//get currencies 
router.get('/currency/all/devises/all', async (req, res) => {
  try {
    const currencies = await invoiceController.getAllCurrencies();
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/allcurrencies', async (req, res) => {
  try {
    const currencies = await invoiceController.getAllCurrencies({
      stripeSupported: req.query.stripeSupported === 'true',
      search: req.query.search || ''
    });
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/currency/all', async (req, res) => {
  try {
    const currencies = await invoiceController.getAllCurrencies({ stripeSupported: true });
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invoice checkout session
router.post('/create-invoice-session', protect, async (req, res) => {
  try {
    const { invoiceId, customerEmail } = req.body;
    const result = await invoiceController.createInvoiceSession(invoiceId, customerEmail);
    res.json(result);
  } catch (error) {
    console.error('Error creating invoice session:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/confirm-invoice', async (req, res) => {
  try {
    const { session_id, invoice_id } = req.query;
    const result = await invoiceController.confirmInvoicePayment(session_id, invoice_id);
    res.json(result);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Invoice CRUD routes
router.post('/', protect, async (req, res) => {
  try {
    const invoice = await invoiceController.createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    // Handle different error types
    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      errorMessage = Object.values(error.errors).map(e => e.message).join(', ');
    } else if (error.name === 'CastError') {
      errorMessage = `Invalid data format: ${error.message}`;
    }

    res.status(400).json({
      error: errorMessage,
      details: error.errors || undefined
    });
  }
});

// In your InvoiceRoute.js file:

router.get('/', protect, async (req, res) => {
  try {
    const invoices = await invoiceController.getAllInvoices(req.user._id, req.user.role);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download invoice PDF
router.get('/download/:invoiceNumber', async (req, res) => {
  try {
    const filePath = path.join(__dirname, `../public/invoices/invoice_${req.params.invoiceNumber}.pdf`);
    if (fs.existsSync(filePath)) {
      res.download(filePath, `invoice_${req.params.invoiceNumber}.pdf`);
    } else {
      res.status(404).json({ error: 'Invoice PDF not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download receipt
router.get('/receipt/:invoiceNumber', async (req, res) => {
  try {
    const filePath = path.join(__dirname, `../public/receipts/receipt_${req.params.invoiceNumber}.pdf`);
    if (fs.existsSync(filePath)) {
      res.download(filePath, `receipt_${req.params.invoiceNumber}.pdf`);
    } else {
      res.status(404).json({ error: 'Receipt PDF not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoices by building
router.get('/building/:buildingId', protect, async (req, res) => {
  try {
    const invoices = await invoiceController.getInvoicesByBuilding(req.params.buildingId);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get invoices by co-owner
router.get('/co-owner/:coOwnerId', protect, async (req, res) => {
  try {
    const invoices = await invoiceController.getInvoicesByCoOwner(req.params.coOwnerId);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get invoices by co-owner and building
router.get('/co-owner/:coOwnerId/building/:buildingId', protect, async (req, res) => {
  try {
    const invoices = await invoiceController.getInvoicesByCoOwnerAndBuilding(
      req.params.coOwnerId, req.params.buildingId
    );
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pay invoice with cash
router.post('/cash/pay/:id/cash', protect, async (req, res) => {
  try {
    const result = await invoiceController.payInvoiceWithCash(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Cash payment processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get invoice by ID
// Add this route to get invoice by ID (if it doesn't exist):
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceController.getInvoiceById(id);
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error in get invoice route:', error);
    res.status(500).json({ 
      message: 'Failed to get invoice', 
      error: error.message 
    });
  }
});

// Update invoice
router.put('/:id', protect, async (req, res) => {
  try {
    await invoiceController.updateInvoice(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

// Delete invoice
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await invoiceController.deleteInvoice(req.params.id);
    res.send(result);
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).send({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
router.get('/:userId/payment-status', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all invoices for this user
    const invoices = await Invoice.find({ coOwner: userId });

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const overdueInvoices = invoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'paid').length;

    const paymentStatus = {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      unpaidInvoices: totalInvoices - paidInvoices,
      paidPercentage: totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
      fullyPaid: totalInvoices > 0 && paidInvoices === totalInvoices
    };

    return res.status(200).json({
      success: true,
      data: paymentStatus
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status'
    });
  }
});


router.get('/coowner/:coownerId', protect, invoiceController.getCoownerInvoices);



// Add this to your existing InvoiceRoute.js file
const { UserReward, Reward } = require('../Models/gamification');

// Apply coupon code to invoice
router.post('/apply-coupon', protect, async (req, res) => {
  try {
    const { invoiceId, couponCode } = req.body;

    if (!invoiceId || !couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID and coupon code are required'
      });
    }

    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if user owns this invoice
    if (invoice.coOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to apply coupon to this invoice'
      });
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply coupon to a paid invoice'
      });
    }

    // Find the coupon by code
    const userReward = await UserReward.findOne({
      code: couponCode.trim(),
      isUsed: false
    }).populate('reward');

    if (!userReward) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or already used coupon code'
      });
    }

    // Check if this coupon belongs to the current user
    if (userReward.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This coupon code does not belong to you'
      });
    }

    // Calculate discount based on reward type
    let discountPercent = 0;
    const rewardName = userReward.reward.name.toLowerCase();

    if (rewardName.includes('5%')) {
      discountPercent = 5;
    } else if (rewardName.includes('10%')) {
      discountPercent = 10;
    } else if (rewardName.includes('skip one month') || rewardName.includes('free')) {
      discountPercent = 100;
    } else {
      // Default small discount if reward type is unknown
      discountPercent = 5;
    }

    // Calculate new total
    const discountAmount = (invoice.total * discountPercent) / 100;
    const newTotal = Math.max(0, invoice.total - discountAmount);

    // Update the invoice with discount
    invoice.total = newTotal;
    invoice.notes = invoice.notes
      ? `${invoice.notes}\nDiscount applied: ${discountPercent}% using coupon ${couponCode}`
      : `Discount applied: ${discountPercent}% using coupon ${couponCode}`;

    // Mark coupon as used
    userReward.isUsed = true;
    await userReward.save();
    // In the apply-coupon route, add this after calculating new total:

    // If after discount the invoice is free (0 cost), mark it as paid
    if (newTotal === 0) {
      invoice.status = 'paid';
      invoice.paymentDate = new Date();
      invoice.paymentMethod = 'coupon';

      // Add payment receipt
      invoice.paymentReceipts = invoice.paymentReceipts || [];
      invoice.paymentReceipts.push({
        date: new Date(),
        amount: 0,
        method: 'coupon',
        transactionId: couponCode,
        notes: 'Full payment covered by coupon'
      });

      // Award gamification points if applicable
      try {
        const gamificationHooks = require('../Utils/GamificationHooks');
        await gamificationHooks.handleInvoicePayment(invoice);
        console.log(`Awarded payment points for invoice ${invoice._id}, paid with 100% coupon`);
      } catch (gamificationError) {
        console.error('Failed to award gamification points:', gamificationError);
        // Don't fail the payment process if gamification fails
      }
    }
    // Save the invoice with new total
    await invoice.save();

    // Get notification controller
    const NotificationController = require('../Controllers/notificationsController');

    // Create notification for successful coupon application
    const notification = await NotificationController.createNotification({
      recipient: req.user._id,
      type: 'alert',
      title: 'Coupon Applied',
      content: `Your coupon code ${couponCode} has been applied to invoice #${invoice.invoiceNumber}. A ${discountPercent}% discount was applied.`,
      relatedTo: invoice._id,
      onModel: 'Invoice',
      senderName: 'Nestleo Payment System',
      isActionable: true
    });

    // Send real-time notification if user is online
    const socketManager = require('../Socket/socketManager').socketManager;
    const recipientSocketId = socketManager.onlineUsers.get(req.user._id.toString());
    if (recipientSocketId) {
      socketManager.io.to(recipientSocketId).emit('notification', {
        ...notification.toObject(),
        invoiceId: invoice._id,
        buildingId: invoice.building,
        amount: discountAmount,
        discountPercent
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      discountApplied: discountPercent,
      discountAmount,
      newTotal
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message
    });
  }
});




// Configure multer storage for payment proofs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/payment_proofs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'payment-' + uniqueSuffix + ext);
  }
});

// Create multer upload instance with file filtering
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG and PDF files are allowed'), false);
    }
    cb(null, true);
  }
});


router.post('/submit-payment-proof', protect, upload.single('proof'), async (req, res) => {
  try {
    const { invoiceId, referenceNumber, paymentDate, notes } = req.body;
    const userId = req.user._id;

    if (!invoiceId || !referenceNumber || !paymentDate) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Check if this invoice belongs to the user
    if (invoice.coOwner.toString() !== userId.toString()) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit proof for this invoice'
      });
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'This invoice is already paid'
      });
    }

    // Update invoice status and add payment proof
    invoice.status = 'pending';
    invoice.paymentProof = {
      filePath: req.file ? req.file.path.replace(/\\/g, '/') : null,
      fileName: req.file ? req.file.originalname : null,
      uploadDate: new Date(),
      referenceNumber,
      paymentDate: new Date(paymentDate),
      notes: notes || "",
      submittedBy: userId
    };

    await invoice.save();

    // Send notification to syndicateAdmin about new payment proof
    try {
      const NotificationController = require('../Controllers/notificationsController');
      const building = await Building.findById(invoice.building);

      if (building && building.user) {
        // Get the admin of this building
        const notification = await NotificationController.createNotification({
          recipient: building.user,
          type: 'alert',
          title: 'Payment Proof Submitted',
          content: `A payment proof for invoice #${invoice.invoiceNumber} has been submitted and is awaiting your review.`,
          relatedTo: invoice._id,
          onModel: 'Invoice',
          senderName: `${req.user.firstName} ${req.user.lastName}`,
          senderAvatar: req.user.avatar,
          isActionable: true
        });

        // Send real-time notification if admin is online
        const socketManager = require('../Socket/socketManager').socketManager;
        const recipientSocketId = socketManager.onlineUsers.get(building.user.toString());
        if (recipientSocketId) {
          socketManager.io.to(recipientSocketId).emit('notification', {
            ...notification.toObject(),
            invoiceId: invoice._id,
            buildingId: invoice.building,
            amount: invoice.total,
            currencySymbol: invoice.currency?.symbol || '$'
          });
        }
      }
    } catch (notificationError) {
      console.error('Error creating payment notification:', notificationError);
      // Don't fail the API call if notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Payment proof submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting payment proof:', error);

    // Clean up file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing uploaded file:', unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Error submitting payment proof',
      error: error.message
    });
  }
});



// Add this route after the submit-payment-proof route
router.post('/review-payment-proof', protect, async (req, res) => {
  try {
    const { invoiceId, isApproved, reviewNotes } = req.body;
    const reviewerId = req.user._id;

    // Validate admin role
    if (!['SyndicateAdmin', 'Admin', 'SuperAdmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can review payment proofs'
      });
    }

    // Find the invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('coOwner')
      .populate('building')
      .populate('currency');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if invoice has payment proof submitted
    if (!invoice.paymentProof) {
      return res.status(400).json({
        success: false,
        message: 'No payment proof found for this invoice'
      });
    }

    // Update payment proof review fields
    invoice.paymentProof.reviewedBy = reviewerId;
    invoice.paymentProof.reviewDate = new Date();
    invoice.paymentProof.reviewNotes = reviewNotes || '';
    invoice.paymentProof.isApproved = isApproved;

    // Update invoice status based on review result
    if (isApproved) {
      invoice.status = 'paid';
      invoice.paymentDate = new Date();
      invoice.paymentMethod = 'bank transfer';

      // Add payment receipt
      invoice.paymentReceipts = invoice.paymentReceipts || [];
      invoice.paymentReceipts.push({
        date: new Date(),
        amount: invoice.total,
        method: 'bank transfer',
        transactionId: invoice.paymentProof.referenceNumber
      });

      // Check for early payment gamification
      const dueDate = new Date(invoice.dueDate);
      const paymentDate = new Date(invoice.paymentProof.paymentDate);
      const daysEarly = Math.max(0, Math.ceil((dueDate - paymentDate) / (1000 * 60 * 60 * 24)));

      // If payment was early (at least 1 day), award gamification points
      if (daysEarly >= 1) {
        try {
          const gamificationHooks = require('../Utils/GamificationHooks');
          await gamificationHooks.handleInvoicePayment(invoice);
          console.log(`Awarded early payment points for invoice ${invoiceId}, paid ${daysEarly} days early`);
        } catch (gamificationError) {
          console.error('Failed to award gamification points:', gamificationError);
          // Don't fail the payment process if gamification fails
        }
      }
    } else {
      invoice.status = 'rejected';
    }

    await invoice.save();

    // Send notification to co-owner
    try {
      const NotificationController = require('../Controllers/notificationsController');

      const notification = await NotificationController.createNotification({
        recipient: invoice.coOwner._id,
        type: 'alert',
        title: isApproved ? 'Payment Approved' : 'Payment Rejected',
        content: isApproved
          ? `Your payment for invoice #${invoice.invoiceNumber} has been approved.`
          : `Your payment for invoice #${invoice.invoiceNumber} was rejected. ${reviewNotes ? `Reason: ${reviewNotes}` : ''}`,
        relatedTo: invoice._id,
        onModel: 'Invoice',
        senderName: `${req.user.firstName} ${req.user.lastName}`,
        senderAvatar: req.user.avatar,
        isActionable: !isApproved // Actionable only if rejected
      });

      // Send real-time notification
      const socketManager = require('../Socket/socketManager').socketManager;
      const recipientSocketId = socketManager.onlineUsers.get(invoice.coOwner._id.toString());
      if (recipientSocketId) {
        socketManager.io.to(recipientSocketId).emit('notification', {
          ...notification.toObject(),
          invoiceId: invoice._id,
          buildingId: invoice.building?._id,
          amount: invoice.total,
          currencySymbol: invoice.currency?.symbol || '$',
          isApproved
        });
      }

      // Send payment confirmation email if approved
      if (isApproved) {
        const { sendPaymentConfirmationEmail } = require('../Utils/Email');
        await sendPaymentConfirmationEmail({
          coOwnerEmail: invoice.coOwner.email,
          coOwnerName: `${invoice.coOwner.firstName} ${invoice.coOwner.lastName}`,
          isBankTransfer: true,
          invoiceData: {
            ...invoice.toObject(),
            currencySymbol: invoice.currency?.symbol || invoice.currencyCode || '€'
          },
          paymentDetails: {
            transactionId: invoice.paymentProof.referenceNumber,
            date: invoice.paymentProof.paymentDate,
            amount: invoice.total,
            method: 'bank transfer',
            receivedBy: `${req.user.firstName} ${req.user.lastName}`
          }
        });
      }
    } catch (notificationError) {
      console.error('Error creating review notification:', notificationError);
      // Don't fail the API call if notification fails
    }

    return res.status(200).json({
      success: true,
      message: isApproved
        ? 'Payment approved and invoice marked as paid'
        : 'Payment proof rejected'
    });
  } catch (error) {
    console.error('Error reviewing payment proof:', error);
    return res.status(500).json({
      success: false,
      message: 'Error reviewing payment proof',
      error: error.message
    });
  }
});

module.exports = router;
