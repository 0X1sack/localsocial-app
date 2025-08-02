const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'customer.subscription.created':
      console.log('Subscription created:', stripeEvent.data.object);
      // TODO: Update user subscription status in your database
      break;
    
    case 'customer.subscription.updated':
      console.log('Subscription updated:', stripeEvent.data.object);
      // TODO: Update user subscription status in your database
      break;
    
    case 'customer.subscription.deleted':
      console.log('Subscription cancelled:', stripeEvent.data.object);
      // TODO: Update user subscription status in your database
      break;
    
    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', stripeEvent.data.object);
      // TODO: Update user subscription status in your database
      break;
    
    case 'invoice.payment_failed':
      console.log('Payment failed:', stripeEvent.data.object);
      // TODO: Handle failed payment
      break;
    
    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};