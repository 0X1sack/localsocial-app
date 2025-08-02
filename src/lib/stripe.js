// Stripe Payment Processing for LocalSocial
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Pricing plans
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 39,
    priceId: 'price_starter_monthly', // Replace with actual Stripe price ID
    features: [
      'Schedule up to 30 posts/month',
      '2 social media accounts',
      'Basic analytics',
      'Email support'
    ],
    limits: {
      postsPerMonth: 30,
      socialAccounts: 2
    }
  },
  professional: {
    name: 'Professional', 
    price: 79,
    priceId: 'price_professional_monthly', // Replace with actual Stripe price ID
    features: [
      'Schedule up to 100 posts/month',
      '5 social media accounts',
      'Advanced analytics',
      'Content templates',
      'Priority support'
    ],
    limits: {
      postsPerMonth: 100,
      socialAccounts: 5
    }
  },
  agency: {
    name: 'Agency',
    price: 149,
    priceId: 'price_agency_monthly', // Replace with actual Stripe price ID
    features: [
      'Unlimited posts',
      'Unlimited social accounts',
      'White-label options',
      'Advanced analytics',
      'Phone & email support',
      'Custom integrations'
    ],
    limits: {
      postsPerMonth: -1, // Unlimited
      socialAccounts: -1 // Unlimited
    }
  }
};

// Create checkout session
export const createCheckoutSession = async (priceId, customerId = null) => {
  try {
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        customerId,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/?canceled=true`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    const stripe = await stripePromise;
    
    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Create customer portal session
export const createPortalSession = async (customerId) => {
  try {
    const response = await fetch('/.netlify/functions/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        returnUrl: `${window.location.origin}/dashboard`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

// Get customer subscription status
export const getSubscriptionStatus = async (customerId) => {
  try {
    const response = await fetch(`/.netlify/functions/subscription-status?customerId=${customerId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch subscription status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return null;
  }
};

export default stripePromise;