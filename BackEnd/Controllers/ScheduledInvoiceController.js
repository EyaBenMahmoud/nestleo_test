const stripe = require('../Config/stripe.js');
const RecurringInvoice = require('../Models/ScheduledInvoices.js');
const Apartment = require('../Models/Appartement.js');
const Invoice = require('../Models/Invoice.js');
const cron = require('node-cron');
const { sendInvoiceEmail, sendInvoiceEmailToAllCoOwners } = require('../Utils/Email.js');


const cronJobs = new Map();

// Helper function to calculate next run date
 function calculateNextRunDate(frequency) {
    const now = new Date();
    switch(frequency) {
      case 'monthly':
        // return new Date(now.getTime() + 60 * 1000);    /// every  60 seconds  just for testing
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'biannually':
        return new Date(now.setMonth(now.getMonth() + 6));
      case 'annually':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }


// Function to process a recurring invoice

 async function processRecurringInvoice(recurringInvoiceId) {
  const recurringInvoice = await RecurringInvoice.findById(recurringInvoiceId)
    .populate('building')
    .populate('selectedBlocs')
    .populate({
        path: 'selectedApartments',
        populate: { path: 'coOwner', select: 'firstName lastName email' }
      })
          .populate('currency')
    .populate('createdBy');

  if (!recurringInvoice || !recurringInvoice.active) return;

  // Get all apartments that should receive invoices
  let apartments = [];
  
  if (recurringInvoice.selectedApartments.length > 0) {
    // Use specifically selected apartments
    apartments = recurringInvoice.selectedApartments;
  } else if (recurringInvoice.selectedBlocs.length > 0) {
    // Get all apartments from selected blocs
    apartments = await Apartment.find({ 
      bloc: { $in: recurringInvoice.selectedBlocs.map(b => b._id) }
    }).populate('coOwner', 'firstName lastName email');
    console.log("apartments from blocs", apartments);
  } else {
    // Get all apartments from the building
    apartments = await Apartment.find({ 
      building: recurringInvoice.building._id 
    }).populate('coOwner', 'firstName lastName email');
    console.log("apartments from building", apartments);
  }

  // Process each apartment
  for (const apartment of apartments) {
    if (!apartment.coOwner) continue;
      
    // Calculate totals
    const subtotal = recurringInvoice.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * recurringInvoice.taxRate;
    const total = subtotal + tax;

    // Create Stripe product and price
    const product = await stripe.products.create({
      name: `Recurring Invoice - ${recurringInvoice.name}`,
      description: `Payment for ${apartment.coOwner.firstName} ${apartment.coOwner.lastName}`,
    });

    const price = await stripe.prices.create({
      unit_amount: Math.round(total * 100),
      currency: recurringInvoice.currency.code.toLowerCase(),
      product: product.id,
    });
    
    console.log("apartment coowner email",apartment.coOwner.email);
    console.log("apartment coowner id",apartment.coOwner._id);
    // Create the invoice
    const invoice = new Invoice({
      syndicateName: recurringInvoice.building.name,
      buildingAddress: recurringInvoice.building.address_street,
      city: recurringInvoice.building.address_city,
      postalCode: '7080', // You might want to make this dynamic
      invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      coOwner: apartment.coOwner._id,
      apartmentNumber: apartment.number,
      items: recurringInvoice.items,
      subtotal,
      taxRate: recurringInvoice.taxRate,
      tax,
      total,
      status: 'unpaid',
      building: recurringInvoice.building._id,
      stripeProductId: product.id,
      stripePriceId: price.id,
      currency: recurringInvoice.currency._id,
      currencyCode: recurringInvoice.currency.code,
      apartmentIds: [apartment._id]
    });

    await invoice.save();

    console.log("apartment coowner email after invoice is created",apartment.coOwner.email);
    console.log("apartment coowner id after invoice is created ",apartment.coOwner._id);

    // Send email
try {
    await sendInvoiceEmailToAllCoOwners({
        body: {
          coOwnerEmail: apartment.coOwner.email,
          status: 'unpaid',
          language: apartment.coOwner.language,
          coOwnerName: `${apartment.coOwner.firstName} ${apartment.coOwner.lastName}`,
          invoiceData: {
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            dueDate: invoice.dueDate,
            items: invoice.items,
            subtotal: subtotal,
            status: 'unpaid',
            tax: tax,
            taxRate: invoice.taxRate,
            total: total,
            coOwner: apartment.coOwner,
            syndicateName: invoice.syndicateName,
            buildingAddress: invoice.buildingAddress,
            apartmentNumber: invoice.apartmentNumber,
            city: invoice.city,
            postalCode: invoice.postalCode,
            currency: invoice.currencyCode,
            currencySymbol: recurringInvoice.currency.symbol,
          },
          isUpdate: false
        }
        
      }

    );
    console.log(`Email successfully sent to ${apartment.coOwner.email} for apartment ${apartment.number}.`);

      
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
  }
  }

  // Update recurring invoice with last run and next run dates
  recurringInvoice.lastRun = new Date();
  recurringInvoice.nextRun = calculateNextRunDate(recurringInvoice.frequency);
  await recurringInvoice.save();
}

  

// Modified scheduleRecurringInvoice function
function scheduleRecurringInvoice(recurringInvoiceId) {
  if (!recurringInvoiceId || typeof recurringInvoiceId !== 'string') {
    throw new Error("scheduleRecurringInvoice requires a valid recurringInvoiceId as a string.");
  }
  
  // Cancel existing job if it exists
  if (cronJobs.has(recurringInvoiceId)) {
    cronJobs.get(recurringInvoiceId).stop();
    cronJobs.delete(recurringInvoiceId);
  }
  
  const job = cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`Running recurring invoice processing for ID: ${recurringInvoiceId}`);
      const invoice = await RecurringInvoice.findById(recurringInvoiceId);
      if (invoice && invoice.active && invoice.nextRun <= new Date()) {
        await processRecurringInvoice(recurringInvoiceId);
      }
    } catch (error) {
      console.error('Error processing recurring invoice:', error);
    }
  });
  
  cronJobs.set(recurringInvoiceId, job);
}

// Function to cancel a cron job
function cancelRecurringInvoiceJob(recurringInvoiceId) {
  if (cronJobs.has(recurringInvoiceId)) {
    cronJobs.get(recurringInvoiceId).stop();
    cronJobs.delete(recurringInvoiceId);
    return true;
  }
  return false;
}





module.exports = {
    calculateNextRunDate,  
    processRecurringInvoice,
    scheduleRecurringInvoice,
    cancelRecurringInvoiceJob,
    cronJobs
  };