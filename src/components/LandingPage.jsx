import { useState } from 'react'
import { CalendarIcon, ChatBubbleLeftRightIcon, ChartBarIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { createCheckoutSession, PRICING_PLANS } from '../lib/stripe'

export default function LandingPage({ onViewChange, user }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGetStarted = () => {
    if (user) {
      onViewChange('dashboard')
    } else {
      onViewChange('auth')
    }
  }

  const handlePurchase = async (planKey) => {
    if (!user) {
      onViewChange('auth')
      return
    }

    setIsLoading(true)
    try {
      const plan = PRICING_PLANS[planKey]
      await createCheckoutSession(plan.priceId)
    } catch (error) {
      console.error('Error starting checkout:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="bg-white">
      {/* Header */}
      <header className="bg-blue-600">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">LocalSocial</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGetStarted}
                className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Social Media Scheduling Made Simple
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Built specifically for local businesses. Schedule posts across Facebook, Instagram, LinkedIn, and Google Business Profile with AI-powered content generation.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <button
                  onClick={handleGetStarted}
                  className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Start Free Trial
                </button>
                <a href="#features" className="text-lg font-semibold leading-6 text-gray-900">
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Everything you need to grow your local business
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Stop juggling multiple platforms. Manage all your social media from one place.
              </p>
            </div>

            <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="flex justify-center">
                  <CalendarIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Smart Scheduling</h3>
                <p className="mt-2 text-gray-600">
                  Schedule posts when your audience is most active. Auto-repost your best content.
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center">
                  <GlobeAltIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Multi-Platform</h3>
                <p className="mt-2 text-gray-600">
                  Post to Facebook, Instagram, LinkedIn, and Google Business Profile simultaneously.
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">AI Content</h3>
                <p className="mt-2 text-gray-600">
                  Generate engaging posts with AI. Local hashtags and SEO optimization included.
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center">
                  <ChartBarIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Analytics</h3>
                <p className="mt-2 text-gray-600">
                  Track engagement, reach, and ROI. Know what content works best for your business.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Choose the plan that fits your business size.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Starter Plan */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Starter</h3>
                  <p className="mt-2 text-gray-600">Perfect for single location businesses</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">$39</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-gray-600">
                    <li>✓ 3 social media profiles</li>
                    <li>✓ 50 scheduled posts/month</li>
                    <li>✓ Basic analytics</li>
                    <li>✓ Google Business Profile</li>
                    <li>✓ Email support</li>
                  </ul>
                  <button 
                    onClick={() => handlePurchase('starter')}
                    disabled={isLoading}
                    className="mt-8 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Start Free Trial'}
                  </button>
                </div>
              </div>

              {/* Professional Plan */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg shadow-sm relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Professional</h3>
                  <p className="mt-2 text-gray-600">For growing businesses and agencies</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">$79</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-gray-600">
                    <li>✓ 10 social media profiles</li>
                    <li>✓ 200 scheduled posts/month</li>
                    <li>✓ AI content generation</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Review monitoring</li>
                    <li>✓ Priority support</li>
                  </ul>
                  <button 
                    onClick={() => handlePurchase('professional')}
                    disabled={isLoading}
                    className="mt-8 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Start Free Trial'}
                  </button>
                </div>
              </div>

              {/* Agency Plan */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Agency</h3>
                  <p className="mt-2 text-gray-600">For agencies and enterprise clients</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">$149</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-gray-600">
                    <li>✓ 25 social media profiles</li>
                    <li>✓ Unlimited scheduled posts</li>
                    <li>✓ White-label reporting</li>
                    <li>✓ Team collaboration</li>
                    <li>✓ API access</li>
                    <li>✓ Dedicated account manager</li>
                  </ul>
                  <button 
                    onClick={() => handlePurchase('agency')}
                    disabled={isLoading}
                    className="mt-8 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Start Free Trial'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span className="block">Ready to grow your business?</span>
              <span className="block text-blue-200">Start your free trial today.</span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Auth Modal */}
    </div>
  )
}