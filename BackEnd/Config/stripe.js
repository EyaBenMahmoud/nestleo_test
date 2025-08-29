const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version
  maxNetworkRetries: 2, // Retry failed requests
});

module.exports = stripe;