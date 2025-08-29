const Invoice = require('../Models/Invoice');
const User = require('../Models/User');
const Building = require('../Models/Building');
const stripe = require('../Config/stripe');
const { sendInvoiceEmail, sendPaymentConfirmationEmail, generateAndSaveInvoicePDF } = require('../Utils/Email');
const Currency = require('../Models/Currency');
const RecurringInvoice = require('../Models/ScheduledInvoices');
const Bloc = require('../Models/Bloc');
const Apartment = require('../Models/Appartement');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { socketManager } = require('../Socket/socketManager');
const NotificationController = require('./notificationsController');







// Calculate next run date for recurring invoices
exports.calculateNextRunDate = (frequency) => {
  const today = new Date();
  let nextRun = new Date(today);

  switch (frequency) {
    case 'monthly':
      nextRun.setMonth(today.getMonth() + 1);
      break;
    case 'quarterly':
      nextRun.setMonth(today.getMonth() + 3);
      break;
    case 'biannually':
      nextRun.setMonth(today.getMonth() + 6);
      break;
    case 'annually':
      nextRun.setFullYear(today.getFullYear() + 1);
      break;
    default:
      nextRun.setMonth(today.getMonth() + 1); // Default to monthly
  }

  return nextRun;
};

// Schedule a recurring invoice
exports.scheduleRecurringInvoice = (recurringInvoiceId) => {
  console.log(`Scheduling invoice job for ID: ${recurringInvoiceId}`);
  // Implementation of scheduling logic
};

// Create a scheduled invoice
exports.createScheduledInvoice = async (invoiceData) => {
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
    } = invoiceData;

    // Validate input
    if (!name || !buildingId || !items || !frequency || !currencyId || !createdById) {
      throw new Error('Missing required fields');
    }

    // Validate frequency
    const validFrequencies = ['monthly', 'quarterly', 'biannually', 'annually'];
    if (!validFrequencies.includes(frequency)) {
      throw new Error('Invalid frequency');
    }

    // Calculate next run date
    const nextRun = this.calculateNextRunDate(frequency);

    // Get currency
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error('Invalid currency');
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
    this.scheduleRecurringInvoice(recurringInvoice._id.toString());

    return recurringInvoice;
  } catch (error) {
    console.error('Error creating recurring invoice:', error);
    throw error;
  }
};

// Get all scheduled invoices
exports.getAllScheduledInvoices = async () => {
  try {
    const invoices = await RecurringInvoice.find()
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy');

    return invoices;
  } catch (error) {
    console.error('Error fetching scheduled invoices:', error);
    throw error;
  }
};

// Get a single scheduled invoice
exports.getScheduledInvoice = async (id) => {
  try {
    const invoice = await RecurringInvoice.findById(id)
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy');

    if (!invoice) {
      throw new Error('Scheduled invoice not found');
    }

    return invoice;
  } catch (error) {
    console.error('Error fetching scheduled invoice:', error);
    throw error;
  }
};

// Update a scheduled invoice
exports.updateScheduledInvoice = async (id, updateData) => {
  try {
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
    } = updateData;

    // Validate required fields
    if (!name || !buildingId || !items || !frequency || !currencyId) {
      throw new Error('Missing required fields');
    }

    // Calculate new nextRun if frequency changed
    const updates = {
      name,
      building: buildingId,
      items,
      frequency,
      taxRate,
      currency: currencyId,
      createdBy: createdById,
      nextRun: this.calculateNextRunDate(frequency),
      lastRun: new Date() // Reset last run since we're updating
    };

    // Handle bloc and apartment selections
    if (blocIds.length > 0) {
      updates.selectedBlocs = blocIds;
    } else {
      updates.selectedBlocs = [];
    }

    if (apartmentIds.length > 0) {
      updates.selectedApartments = apartmentIds;
    } else {
      updates.selectedApartments = [];
    }

    // Update the invoice
    const updatedInvoice = await RecurringInvoice.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    )
      .populate('building')
      .populate('selectedBlocs')
      .populate('selectedApartments')
      .populate('currency')
      .populate('createdBy');

    if (!updatedInvoice) {
      throw new Error('Scheduled invoice not found');
    }

    return updatedInvoice;
  } catch (error) {
    console.error('Error updating scheduled invoice:', error);
    throw error;
  }
};

// Delete a scheduled invoice
exports.deleteScheduledInvoice = async (id) => {
  try {
    const deletedInvoice = await RecurringInvoice.findByIdAndDelete(id);

    if (!deletedInvoice) {
      throw new Error('Scheduled invoice not found');
    }

    return { message: 'Scheduled invoice deleted successfully' };
  } catch (error) {
    console.error('Error deleting scheduled invoice:', error);
    throw error;
  }
};

// Toggle active status (stop/start)
exports.toggleInvoiceActiveStatus = async (id) => {
  try {
    const invoice = await RecurringInvoice.findById(id);

    if (!invoice) {
      throw new Error('Scheduled invoice not found');
    }

    invoice.active = !invoice.active;
    await invoice.save();

    return {
      message: `Scheduled invoice ${invoice.active ? 'activated' : 'deactivated'}`,
      active: invoice.active
    };
  } catch (error) {
    console.error('Error toggling scheduled invoice status:', error);
    throw error;
  }
};

// Get all currencies
exports.getAllCurrencies = async (options = {}) => {
  try {
    const { stripeSupported, search } = options;
    let query = {};

    if (stripeSupported === true) {
      query.stripeSupported = true;
    }

    if (search) {
      query.$or = [
        { code: new RegExp(search, 'i') },
        { name: new RegExp(search, 'i') }
      ];
    }

    const currencies = await Currency.find(query)
      .sort({ isDefault: -1, code: 1 });

    return currencies;
  } catch (error) {
    console.error('Error getting currencies:', error);
    throw error;
  }
};



// Create new invoice
exports.createInvoice = async (invoiceData) => {
  // Declare Stripe variables at the top to make them available in catch block
  let product, price;

  try {
    const { coOwner, syndicateName, buildingAddress, city, postalCode, invoiceNumber, date, dueDate, apartmentNumber, items, subtotal,
      taxRate, tax, total, status, building, currency,
    } = invoiceData;

    // Validate taxRate is between 0-1 if provided
    if (taxRate < 0 || taxRate > 1) {
      throw new Error('Tax rate must be between 0 and 1');
    }

    // Validate required fields (excluding building from validation)
    if (!currency || !syndicateName || !buildingAddress || !city || !postalCode ||
      !invoiceNumber || !date || !dueDate ||
      !apartmentNumber || !items || !subtotal || !total || !status || !coOwner) {
      throw new Error('Missing required fields');
    }

    // Verify the user exists and validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(coOwner)) {
      throw new Error('Invalid coOwner ID format');
    }
    const user = await User.findById(coOwner);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate currency ObjectId
    if (!mongoose.Types.ObjectId.isValid(currency)) {
      throw new Error('Invalid currency ID format');
    }

    const selectedCurrency = await Currency.findById(currency);
    if (!selectedCurrency) {
      throw new Error('Invalid currency');
    }

    // Check if Stripe supports this currency
    if (!selectedCurrency.stripeSupported) {
      throw new Error('This currency is not supported for payments');
    }


    // Validate and prepare items
    const invoiceItems = items.map(item => ({
      description: item.description,
      amount: Number(item.amount) || 0 // Ensure amount is a number
    }));

    // Create the invoice with Stripe IDs
    const invoice = new Invoice({
      syndicateName,
      buildingAddress,
      city,
      postalCode,
      invoiceNumber,
      date,
      dueDate,
      coOwner, // This should be an ObjectId
      apartmentNumber,
      items: invoiceItems,
      subtotal: Number(subtotal),
      taxRate: Number(taxRate),
      tax: Number(tax),
      total: Number(total),
      status,
      building: building || undefined, // Optional field
      currency: selectedCurrency._id, // Store ObjectId
      currencyCode: selectedCurrency.code,
    });

    await invoice.save();
    // Get all invoices
    // Send notification to co-owner about new invoice
    try {
      // First get the admin who created this invoice (assuming it's in the request user)
      let creatorName = syndicateName;
      let creatorId = null;

      // Create notification with enhanced content
      const notification = await NotificationController.createNotification({
        recipient: coOwner,
        type: 'alert',
        title: 'New Invoice',
        content: `A new invoice (#${invoiceNumber}) for ${selectedCurrency.symbol}${total} has been issued to you for apartment ${apartmentNumber}.`,
        relatedTo: invoice._id,
        onModel: 'Invoice',
        senderName: creatorName,
        senderAvatar: creatorId,
        isActionable: true
      });

      // Send real-time notification if user is online
      const recipientSocketId = socketManager.onlineUsers.get(coOwner.toString());
      if (recipientSocketId) {
        console.log(`Sending invoice notification to socket: ${recipientSocketId}`);
        socketManager.io.to(recipientSocketId).emit('notification', {
          ...notification.toObject(),
          invoiceId: invoice._id,
          buildingId: building,
          amount: total,
          currencySymbol: selectedCurrency.symbol
        });
      }
    } catch (notificationError) {
      console.error('Error creating invoice notification:', notificationError);
    }

    // Send email with invoice data (non-blocking)
    sendInvoiceEmail({
      body: {
        coOwnerEmail: user.email,
        status,
        language: user.language,
        coOwnerName: `${user.firstName} ${user.lastName}`,
        invoiceData: {
          invoiceNumber,
          date,
          dueDate,
          items: invoiceItems,
          subtotal,
          status,
          tax,
          taxRate,
          total,
          coOwner: user,
          syndicateName,
          buildingAddress,
          apartmentNumber,
          city,
          postalCode,
          currency: selectedCurrency.code,
          currencySymbol: selectedCurrency.symbol,
          // Ajouter le nom du building
          building: building ? await Building.findById(building).select('name') : null,
          buildingName: building ? (await Building.findById(building).select('name'))?.name : syndicateName,
        },
        pdfPath: `invoice_${invoice.invoiceNumber}.pdf`
      }
    }).catch(emailError => {
      console.error('Email sending failed:', emailError);
    });

    // Send invoice emails to active delegates as well
    try {
      const userWithDelegates = await User.findById(coOwner).populate('delegates.user', 'firstName lastName email language');

      if (userWithDelegates && userWithDelegates.delegates && userWithDelegates.delegates.length > 0) {
        // Find active payment delegates
        const activePaymentDelegates = userWithDelegates.delegates.filter(delegate =>
          (delegate.type === 'payment' || delegate.type === 'both') &&
          delegate.paymentDelegation.isActive &&
          delegate.user // Make sure delegate user exists
        );

        // Send emails to each active payment delegate
        for (const delegate of activePaymentDelegates) {
          if (delegate.user) {
            sendInvoiceEmail({
              body: {
                coOwnerEmail: delegate.user.email,
                status,
                language: delegate.user.language || 'en',
                coOwnerName: `${delegate.user.firstName} ${delegate.user.lastName}`,
                invoiceData: {
                  invoiceNumber,
                  date,
                  dueDate,
                  items: invoiceItems,
                  subtotal,
                  status,
                  tax,
                  taxRate,
                  total,
                  coOwner: user, // Keep original coOwner reference
                  syndicateName,
                  buildingAddress,
                  apartmentNumber,
                  city,
                  postalCode,
                  currency: selectedCurrency.code,
                  currencySymbol: selectedCurrency.symbol,
                  isDelegateEmail: true, // Flag to indicate this is for a delegate
                  delegatedFor: `${user.firstName} ${user.lastName}`, // Name of the person they're delegated for
                  delegateAmount: delegate.paymentDelegation.delegateAmount || 0,
                  sharedPercentage: delegate.paymentDelegation.sharedPercentage || 0,
                  // Ajouter le nom du building
                  building: building ? await Building.findById(building).select('name') : null,
                  buildingName: building ? (await Building.findById(building).select('name'))?.name : syndicateName,
                },
                pdfPath: `invoice_${invoice.invoiceNumber}.pdf`
              }
            }).catch(delegateEmailError => {
              console.error(`Failed to send invoice email to delegate ${delegate.user.email}:`, delegateEmailError);
            });

            // Create notification for delegate
            try {
              await NotificationController.createNotification({
                recipient: delegate.user._id,
                type: 'alert',
                title: 'New Invoice (Delegate)',
                content: `A new invoice (#${invoiceNumber}) for ${selectedCurrency.symbol}${total} has been issued for ${user.firstName} ${user.lastName} (apartment ${apartmentNumber}). You are their payment delegate.`,
                relatedTo: invoice._id,
                onModel: 'Invoice',
                senderName: syndicateName,
                isActionable: true
              });

              // Send real-time notification to delegate if online
              const delegateSocketId = socketManager.onlineUsers.get(delegate.user._id.toString());
              if (delegateSocketId) {
                socketManager.io.to(delegateSocketId).emit('notification', {
                  type: 'invoice_delegate',
                  title: 'New Invoice (Delegate)',
                  content: `Invoice #${invoiceNumber} for ${user.firstName} ${user.lastName}`,
                  invoiceId: invoice._id,
                  delegatedFor: `${user.firstName} ${user.lastName}`,
                  amount: total,
                  currencySymbol: selectedCurrency.symbol
                });
              }
            } catch (delegateNotifError) {
              console.error(`Error creating delegate notification for ${delegate.user.email}:`, delegateNotifError);
            }
          }
        }
      }
    } catch (delegateError) {
      console.error('Error sending invoice to delegates:', delegateError);
    }

    return {
      ...invoice.toObject(),
      pdfUrl: `/api/invoices/download/${invoice.invoiceNumber}`
    };

  } catch (error) {
    console.error('Error creating invoice:', error);

    throw error;
  }
};


//Get All Invoices 
exports.getAllInvoices = async (userId, userRole) => {
  try {
    // Base query
    let query = {};

    // For SyndicateAdmin, only show invoices from their buildings
    if (userRole === 'SyndicateAdmin') {
      // Get all buildings managed by this SyndicateAdmin
      const managedBuildings = await Building.find({ user: userId }).select('_id');
      const buildingIds = managedBuildings.map(building => building._id);

      // Only show invoices from these buildings
      query.building = { $in: buildingIds };
    }
    // For SuperAdmin and Admin, show all invoices (no filter)
    // Other roles shouldn't access this endpoint (handled in middleware)

    const invoices = await Invoice.find(query)
      .populate('coOwner', 'firstName lastName email phoneNumber avatar')
      .populate('building', 'name matricule address_street address_city')
      .populate('currency')
      .sort({ createdAt: -1 }); // Show newest first

    return invoices;
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
};

// Replace the getInvoiceById function:
// Replace the getInvoiceById function:
exports.getInvoiceById = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error('Invoice ID is required');
  }

  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate({
        path: 'coOwner',
        select: 'firstName lastName email apartments',
        populate: {
          path: 'apartments',
          select: 'number floor _id'
        }
      })
      .populate('building', 'name address_street address_city address_number')
      .populate('currency', 'code name symbol _id');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log("Invoice fetched with populated data:", {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber, // Make sure this is logged
      coOwner: invoice.coOwner?._id,
      coOwnerName: invoice.coOwner ? `${invoice.coOwner.firstName} ${invoice.coOwner.lastName}` : 'N/A',
      apartmentIds: invoice.apartmentIds,
      apartmentNumber: invoice.apartmentNumber,
      apartments: invoice.coOwner?.apartments?.length || 0
    });

    return invoice;
  } catch (error) {
    console.error('Error getting invoice by ID:', error);
    throw error;
  }
};
// Get invoices by building ID
exports.getInvoicesByBuilding = async (buildingId) => {
  try {
    const invoices = await Invoice.find({ building: buildingId })
      .populate('coOwner')
      .populate('building')
      .populate('currency');
    return invoices;
  } catch (error) {
    console.error('Error getting invoices by building:', error);
    throw error;
  }
};

// Get invoices by co-owner ID
exports.getInvoicesByCoOwner = async (coOwnerId) => {
  try {
    const invoices = await Invoice.find({ coOwner: coOwnerId })
      .populate('coOwner')
      .populate('building');
    return invoices;
  } catch (error) {
    console.error('Error getting invoices by co-owner:', error);
    throw error;
  }
};

// Get invoices by co-owner ID and building ID
exports.getInvoicesByCoOwnerAndBuilding = async (coOwnerId, buildingId) => {
  try {
    const invoices = await Invoice.find({
      coOwner: coOwnerId,
      building: buildingId
    })
      .populate('coOwner')
      .populate('building');
    return invoices;
  } catch (error) {
    console.error('Error getting invoices by co-owner and building:', error);
    throw error;
  }
};

// Process cash payment
exports.payInvoiceWithCash = async (invoiceId, paymentData) => {
  try {
    console.log('Cash payment request received for invoice:', invoiceId);
    const { receiptNumber, receivedBy, paymentDate } = paymentData;

    // Validate required fields
    if (!receiptNumber || !receivedBy || !paymentDate) {
      throw new Error('Missing required fields: receiptNumber, receivedBy, or paymentDate');
    }

    // Get invoice with populated data
    const invoice = await Invoice.findById(invoiceId)
      .populate('coOwner')
      .populate('building')
      .populate('currency');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('Processing payment for invoice:', invoice.invoiceNumber);

    // Update invoice with payment details
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'paid',
        paymentDate: new Date(paymentDate),
        paymentMethod: 'cash',
        $push: {
          paymentReceipts: {
            date: new Date(paymentDate),
            amount: invoice.total || invoice.totalAmount,
            method: 'cash',
            receiptNumber,
            receivedBy: receivedBy || `${invoice.coOwner.firstName} ${invoice.coOwner.lastName}`
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('coOwner building currency');

    if (!updatedInvoice) {
      throw new Error('Failed to update invoice');
    }

    // Update PDF invoice
    try {
      const originalInvoicePath = path.join(
        __dirname,
        `../public/invoices/invoice_${updatedInvoice.invoiceNumber}.pdf`
      );

      if (fs.existsSync(originalInvoicePath)) {
        fs.unlinkSync(originalInvoicePath);
      }
      const invoiceData = {
        ...updatedInvoice.toObject(),
        currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€'
      };

      await generateAndSaveInvoicePDF(invoiceData);
      console.log('Updated PDF generated successfully');
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
    }

    // Ensure invoice amount is correctly retrieved from the fetched invoice.
    const totalAmount = Number(updatedInvoice.total || updatedInvoice.totalAmount);
    if (isNaN(totalAmount)) {
      throw new Error("Invoice total amount is missing or invalid");
    }

    // Send payment confirmation email
    console.log('Sending payment confirmation email...');
    try {
      await sendPaymentConfirmationEmail({
        coOwnerEmail: updatedInvoice.coOwner.email,
        coOwnerName: `${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName}`,
        iscash: true,
        invoiceData: {
          ...updatedInvoice.toObject(),
          currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€'
        },
        paymentDetails: {
          transactionId: receiptNumber,
          date: new Date(paymentDate),
          amount: totalAmount,
          method: 'cash',
          receiptNumber,
          receivedBy
        }
      });
      console.log('Payment confirmation email sent');
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    // Send payment confirmation emails to active delegates as well
    try {
      const userWithDelegates = await User.findById(updatedInvoice.coOwner._id).populate('delegates.user', 'firstName lastName email language');

      if (userWithDelegates && userWithDelegates.delegates && userWithDelegates.delegates.length > 0) {
        // Find active payment delegates
        const activePaymentDelegates = userWithDelegates.delegates.filter(delegate =>
          (delegate.type === 'payment' || delegate.type === 'both') &&
          delegate.paymentDelegation.isActive &&
          delegate.user // Make sure delegate user exists
        );

        // Send payment confirmation emails to each active payment delegate
        for (const delegate of activePaymentDelegates) {
          if (delegate.user) {
            try {
              await sendPaymentConfirmationEmail({
                coOwnerEmail: delegate.user.email,
                coOwnerName: `${delegate.user.firstName} ${delegate.user.lastName}`,
                iscash: true,
                isDelegateEmail: true,
                delegatedFor: `${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName}`,
                invoiceData: {
                  ...updatedInvoice.toObject(),
                  currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€'
                },
                paymentDetails: {
                  transactionId: receiptNumber,
                  date: new Date(paymentDate),
                  amount: totalAmount,
                  method: 'cash',
                  receiptNumber,
                  receivedBy,
                  delegateAmount: delegate.paymentDelegation.delegateAmount || 0,
                  sharedPercentage: delegate.paymentDelegation.sharedPercentage || 0
                }
              });
              console.log(`Payment confirmation email sent to delegate: ${delegate.user.email}`);
            } catch (delegateEmailError) {
              console.error(`Failed to send payment confirmation email to delegate ${delegate.user.email}:`, delegateEmailError);
            }
          }
        }
      }
    } catch (delegateError) {
      console.error('Error sending payment confirmation to delegates:', delegateError);
    }

    // Send notification to co-owner about payment
    try {
      const notification = await NotificationController.createNotification({
        recipient: updatedInvoice.coOwner._id,
        type: 'alert',
        title: 'Cash Payment Recorded',
        content: `Your cash payment of ${updatedInvoice.currency?.symbol || ''}${totalAmount} for invoice #${updatedInvoice.invoiceNumber} has been recorded by ${receivedBy || 'the administrator'}.`,
        relatedTo: updatedInvoice._id,
        onModel: 'Invoice',
        // Update invoice
        senderName: receivedBy || 'Nestleo Payment System',
        isActionable: false
      });

      // Send real-time notification if user is online
      const recipientSocketId = socketManager.onlineUsers.get(updatedInvoice.coOwner._id.toString());
      if (recipientSocketId) {
        socketManager.io.to(recipientSocketId).emit('notification', {
          ...notification.toObject(),
          invoiceId: updatedInvoice._id,
          buildingId: updatedInvoice.building?._id,
          amount: totalAmount,
          currencySymbol: updatedInvoice.currency?.symbol,
          paymentMethod: 'cash'
        });
      }
      const dueDate = new Date(updatedInvoice.dueDate);
      const paymentDate = new Date(updatedInvoice.paymentDate);
      const daysEarly = Math.max(0, Math.ceil((dueDate - paymentDate) / (1000 * 60 * 60 * 24)));

      // If payment was early (at least 1 day), award gamification points
      if (daysEarly >= 1) {
        try {
          // Import gamification integration service if not already imported
          const gamificationHooks = require('../Utils/GamificationHooks');
          await gamificationHooks.handleInvoicePayment(updatedInvoice);
          console.log(`Awarded early payment points for invoice ${invoiceId}, paid ${daysEarly} days early`);
        } catch (gamificationError) {
          console.error('Failed to award gamification points:', gamificationError);
          // Don't fail the payment process if gamification fails
        }
      }
    } catch (notificationError) {
      console.error('Error creating payment notification:', notificationError);
    }

    return {
      success: true,
      invoice: {
        ...updatedInvoice.toObject(),
        currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€'
      }
    };
  } catch (error) {
    console.error('Cash payment processing error:', error);
    throw error;
  }
};


// Delete invoice
exports.deleteInvoice = async (id) => {
  try {
    const invoice = await Invoice.findById(id)
      .populate('coOwner')
      .populate('currency');

    if (!invoice) {
      throw new Error('Invoice not found');
    }


    // Create notification before deleting
    try {
      const notification = await NotificationController.createNotification({
        recipient: invoice.coOwner._id,
        type: 'alert',
        title: 'Invoice Cancelled',
        content: `Invoice #${invoice.invoiceNumber} for ${invoice.currency?.symbol || ''}${invoice.total} has been cancelled.`,
        onModel: 'Invoice',
        senderName: 'Nestleo Invoice System',
        isActionable: false
      });

      // Send real-time notification if user is online
      const recipientSocketId = socketManager.onlineUsers.get(invoice.coOwner._id.toString());
      if (recipientSocketId) {
        socketManager.io.to(recipientSocketId).emit('notification', {
          ...notification.toObject(),
          invoiceId: invoice._id,
          action: 'deleted'
        });
      }
    } catch (notificationError) {
      console.error('Error creating invoice deletion notification:', notificationError);
    }

    // Delete the invoice
    await Invoice.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Invoice and associated Stripe resources archived'
    };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};


// Update invoice with notification
// Add/update the updateInvoice function:
// Update the updateInvoice function:
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log("Update request received for invoice:", id);
    console.log("Update data:", updateData);

    if (!id) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }

    // Find existing invoice
    const existingInvoice = await Invoice.findById(id)
      .populate('coOwner')
      .populate('building')
      .populate('currency');

    if (!existingInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    console.log("Existing invoice found:", {
      id: existingInvoice._id,
      invoiceNumber: existingInvoice.invoiceNumber,
      currency: existingInvoice.currency
    });

    // Initialize update object with existing required fields
    const updateObj = {
      ...updateData,
      // Preserve required fields if not provided in update
      invoiceNumber: updateData.invoiceNumber || existingInvoice.invoiceNumber,
      updatedAt: new Date()
    };

    // Handle currency changes - validate if currency is provided and not empty
    if (updateData.currency && updateData.currency.trim() !== "") {
      const newCurrency = await Currency.findById(updateData.currency);
      if (!newCurrency) {
        return res.status(400).json({ message: 'Invalid currency ID provided' });
      }
      updateObj.currency = newCurrency._id;
      updateObj.currencyCode = newCurrency.code;
      console.log("Currency updated to:", newCurrency.code);
    } else if (updateData.currency === "" || updateData.currency === null) {
      // If empty currency is provided, keep the existing one
      updateObj.currency = existingInvoice.currency._id || existingInvoice.currency;
      console.log("Keeping existing currency");
    }

    // Handle tax rate changes and recalculate tax amount if needed
    if (updateData.taxRate !== undefined) {
      const newTaxRate = Number(updateData.taxRate);
      if (isNaN(newTaxRate) || newTaxRate < 0 || newTaxRate > 1) {
        return res.status(400).json({ message: 'Tax rate must be between 0 and 1' });
      }

      // Recalculate tax amount if items or tax rate changed
      const items = updateData.items || existingInvoice.items;
      const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      updateObj.tax = subtotal * newTaxRate;
      updateObj.taxRate = newTaxRate;
      updateObj.subtotal = subtotal;

      // Recalculate total if not explicitly provided
      if (updateData.total === undefined) {
        updateObj.total = subtotal + updateObj.tax;
      }
    } else if (updateData.items) {
      // If items changed but tax rate didn't, recalculate using existing tax rate
      const subtotal = updateData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const taxRate = existingInvoice.taxRate || 0.2;
      updateObj.tax = subtotal * taxRate;
      updateObj.subtotal = subtotal;

      // Recalculate total if not explicitly provided
      if (updateData.total === undefined) {
        updateObj.total = subtotal + updateObj.tax;
      }
    }

    // Format items array if provided
    if (updateData.items) {
      updateObj.items = updateData.items.map(item => ({
        description: String(item.description || '').trim(),
        amount: Number(item.amount) || 0
      }));
    }

    // Validate apartment data
    if (updateData.apartmentIds && Array.isArray(updateData.apartmentIds)) {
      updateObj.apartmentIds = updateData.apartmentIds;
    }

    if (updateData.apartmentNumber) {
      updateObj.apartmentNumber = String(updateData.apartmentNumber);
    }

    console.log("Final update object:", updateObj);

    // Update the invoice using findByIdAndUpdate to avoid validation issues
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      updateObj,
      { 
        new: true, 
        runValidators: false, // Disable validators to avoid required field issues
        useFindAndModify: false 
      }
    )
      .populate('coOwner')
      .populate('building')
      .populate('currency');

    if (!updatedInvoice) {
      return res.status(404).json({ message: 'Invoice not found after update' });
    }

    console.log("Invoice updated successfully:", updatedInvoice._id);

    // Determine what changed for the notification message
    const changesText = [];
    if (updateData.dueDate && updateData.dueDate !== existingInvoice.dueDate) {
      changesText.push(`due date changed to ${new Date(updateData.dueDate).toLocaleDateString()}`);
    }
    if (updateData.total && updateData.total !== existingInvoice.total) {
      changesText.push(`total amount updated to ${updatedInvoice.currency?.symbol || ''}${updateData.total}`);
    }
    if (updateData.items) {
      changesText.push('items updated');
    }
    if (updateData.status && updateData.status !== existingInvoice.status) {
      changesText.push(`status changed to ${updateData.status}`);
    }
    if (updateData.coOwner && updateData.coOwner !== existingInvoice.coOwner._id.toString()) {
      changesText.push('co-owner changed');
    }
    if (updateData.apartmentNumber && updateData.apartmentNumber !== existingInvoice.apartmentNumber) {
      changesText.push(`apartment changed to ${updateData.apartmentNumber}`);
    }

    const changeDescription = changesText.length > 0
      ? ` (${changesText.join(', ')})`
      : '';
    
    // Send notification about invoice update
    try {
      const notification = await NotificationController.createNotification({
        recipient: updatedInvoice.coOwner._id,
        type: 'alert',
        title: 'Invoice Updated',
        content: `Your invoice #${updatedInvoice.invoiceNumber} has been updated${changeDescription}.`,
        relatedTo: updatedInvoice._id,
        onModel: 'Invoice',
        senderName: 'Nestleo Invoice System',
        isActionable: true
      });

      // Send real-time notification if user is online
      const recipientSocketId = socketManager.onlineUsers.get(updatedInvoice.coOwner._id.toString());
      if (recipientSocketId) {
        socketManager.io.to(recipientSocketId).emit('notification', {
          ...notification.toObject(),
          invoiceId: updatedInvoice._id,
          buildingId: updatedInvoice.building?._id,
          amount: updatedInvoice.total,
          currencySymbol: updatedInvoice.currency?.symbol
        });
      }
    } catch (notificationError) {
      console.error('Error creating invoice update notification:', notificationError);
      // Don't fail the update if notification fails
    }
    
    // Send email notification
    try {
      await sendInvoiceEmail({
        body: {
          coOwnerEmail: updatedInvoice.coOwner.email,
          status: updatedInvoice.status,
          language: updatedInvoice.coOwner.language,
          coOwnerName: `${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName}`,
          invoiceData: {
            ...updatedInvoice.toObject(),
            currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€',
            buildingName: updatedInvoice.building?.name || updatedInvoice.buildingAddress
          },
          isUpdate: true
        }
      });
      console.log("Update notification email sent successfully");
    } catch (emailError) {
      console.error("Failed to send update email:", emailError);
      // Don't fail the update if email fails
    }

    // Send notification to delegates if applicable
    try {
      const userWithDelegates = await User.findById(updatedInvoice.coOwner._id).populate('delegates.user', 'firstName lastName email language');

      if (userWithDelegates && userWithDelegates.delegates && userWithDelegates.delegates.length > 0) {
        // Find active payment delegates
        const activePaymentDelegates = userWithDelegates.delegates.filter(delegate =>
          (delegate.type === 'payment' || delegate.type === 'both') &&
          delegate.paymentDelegation.isActive &&
          delegate.user // Make sure delegate user exists
        );

        // Send emails to each active payment delegate
        for (const delegate of activePaymentDelegates) {
          if (delegate.user) {
            try {
              await sendInvoiceEmail({
                body: {
                  coOwnerEmail: delegate.user.email,
                  status: updatedInvoice.status,
                  language: delegate.user.language || 'en',
                  coOwnerName: `${delegate.user.firstName} ${delegate.user.lastName}`,
                  invoiceData: {
                    ...updatedInvoice.toObject(),
                    currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€',
                    buildingName: updatedInvoice.building?.name || updatedInvoice.buildingAddress,
                    isDelegateEmail: true, 
                    delegatedFor: `${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName}`,
                    delegateAmount: delegate.paymentDelegation.delegateAmount || 0,
                    sharedPercentage: delegate.paymentDelegation.sharedPercentage || 0
                  },
                  isUpdate: true
                }
              });
              
              // Create notification for delegate
              await NotificationController.createNotification({
                recipient: delegate.user._id,
                type: 'alert',
                title: 'Invoice Updated (Delegate)',
                content: `Invoice #${updatedInvoice.invoiceNumber} for ${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName} has been updated${changeDescription}. You are their payment delegate.`,
                relatedTo: updatedInvoice._id,
                onModel: 'Invoice',
                senderName: 'Nestleo Invoice System',
                isActionable: true
              });
              
              // Send real-time notification to delegate if online
              const delegateSocketId = socketManager.onlineUsers.get(delegate.user._id.toString());
              if (delegateSocketId) {
                socketManager.io.to(delegateSocketId).emit('notification', {
                  type: 'invoice_delegate_update',
                  title: 'Invoice Updated (Delegate)',
                  content: `Invoice #${updatedInvoice.invoiceNumber} for ${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName}${changeDescription}`,
                  invoiceId: updatedInvoice._id,
                  delegatedFor: `${updatedInvoice.coOwner.firstName} ${updatedInvoice.coOwner.lastName}`,
                  amount: updatedInvoice.total,
                  currencySymbol: updatedInvoice.currency?.symbol
                });
              }
            } catch (delegateError) {
              console.error(`Failed to send update notification to delegate ${delegate.user.email}:`, delegateError);
              // Continue with other delegates if one fails
            }
          }
        }
      }
    } catch (delegateError) {
      console.error('Error sending invoice update to delegates:', delegateError);
      // Don't fail the update if delegate notifications fail
    }

    // Send response with populated data
    const responseData = {
      ...updatedInvoice.toObject(),
      currencySymbol: updatedInvoice.currency?.symbol || updatedInvoice.currencyCode || '€'
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ 
      message: 'Failed to update invoice', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};




exports.getCoownerInvoices = async (req, res) => {
  try {
    const { coownerId } = req.params;
    const { buildingId } = req.query; // Get buildingId from query parameters

    // Validate MongoDB ID format for coownerId
    if (!mongoose.Types.ObjectId.isValid(coownerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid co-owner ID format'
      });
    }

    // Validate buildingId format if provided
    if (buildingId && !mongoose.Types.ObjectId.isValid(buildingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid building ID format'
      });
    }

    // Find the user to confirm they exist and are a co-owner
    const user = await User.findById(coownerId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Co-owner not found'
      });
    }

    // Construct the filter query
    const filterQuery = { coOwner: coownerId };

    // Add building filter if provided
    if (buildingId) {
      filterQuery.building = buildingId;
    }

    // Find invoices with the constructed filter
    const invoices = await Invoice.find(filterQuery)
      .populate('building', 'name')
      .populate('apartment', 'number floor')
      .sort({ dueDate: -1 }); // Most recent due dates first

    // Process invoices to include status
    const processedInvoices = invoices.map(invoice => {
      const today = new Date();
      const dueDate = new Date(invoice.dueDate);

      // Determine status
      let status = 'pending';

      if (invoice.isPaid || invoice.paymentDate) {
        status = 'paid';
      } else if (dueDate < today) {
        status = 'overdue';
      }

      // Return invoice with additional fields
      return {
        ...invoice.toObject(),
        status,
        isOverdue: status === 'overdue',
        daysOverdue: status === 'overdue' ? Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)) : 0
      };
    });

    // Calculate summary statistics
    const totalInvoices = processedInvoices.length;
    const paidInvoices = processedInvoices.filter(i => i.status === 'paid').length;
    const overdueInvoices = processedInvoices.filter(i => i.status === 'overdue').length;
    const pendingInvoices = processedInvoices.filter(i => i.status === 'pending').length;

    const totalAmount = processedInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paidAmount = processedInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    // Include the buildingId in the response if it was provided
    const responseData = {
      success: true,
      data: processedInvoices,
      summary: {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        pendingInvoices,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        paymentRate: totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0
      }
    };

    // Add buildingId to the response if it was used as a filter
    if (buildingId) {
      responseData.buildingId = buildingId;
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching co-owner invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch co-owner invoices',
      error: error.message
    });
  }
};

