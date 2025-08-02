import { useState } from 'react'
import { auth, db } from '../lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    
    setLoading(true)
    setMessage('')

    try {
      if (isResetPassword) {
        const { error } = await auth.resetPassword(email)
        if (error) throw error
        setMessage('Check your email for the password reset link!')
        setIsResetPassword(false)
      } else if (isSignUp) {
        // Sign up with additional metadata
        const metadata = {
          full_name: fullName.trim(),
          business_name: businessName.trim(),
          business_type: businessType
        }
        
        const { user, error } = await auth.signUp(email, password, metadata)
        if (error) throw error
        
        if (user) {
          // Profile will be automatically created by the database trigger
          // The trigger uses metadata from the auth user
          console.log('User created successfully:', user.email)
        }
        
        setMessage('Check your email for the confirmation link!')
      } else {
        const { user, session, error } = await auth.signIn(email, password)
        if (error) throw error
        
        if (user && session) {
          // Profile should already exist from registration trigger
          console.log('User signed in successfully:', user.email)
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage(error.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  const handleModeSwitch = (mode) => {
    setMessage('')
    setIsSignUp(mode === 'signup')
    setIsResetPassword(mode === 'reset')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            LocalSocial
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Social media scheduling made simple for local businesses
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="rounded-md shadow-sm space-y-px">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                  isSignUp && !isResetPassword ? 'rounded-t-md' : isResetPassword ? 'rounded-md' : 'rounded-t-md'
                }`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Sign Up Additional Fields */}
            {isSignUp && !isResetPassword && (
              <>
                <div>
                  <label htmlFor="fullName" className="sr-only">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="businessName" className="sr-only">
                    Business Name
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    autoComplete="organization"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="businessType" className="sr-only">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  >
                    <option value="">Select Business Type</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="salon">Salon/Spa</option>
                    <option value="gym">Gym/Fitness</option>
                    <option value="retail">Retail Store</option>
                    <option value="service">Service Business</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="realestate">Real Estate</option>
                    <option value="consulting">Consulting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </>
            )}

            {/* Password Field (not shown for reset password) */}
            {!isResetPassword && (
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-md ${message.includes('error') || message.includes('Invalid') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (
                isResetPassword ? 'Send Reset Link' : 
                isSignUp ? 'Create Account' : 
                'Sign In'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            {!isResetPassword && (
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 text-sm block w-full"
                onClick={() => handleModeSwitch(isSignUp ? 'signin' : 'signup')}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            )}
            
            {!isSignUp && !isResetPassword && (
              <button
                type="button"
                className="text-gray-600 hover:text-gray-500 text-sm block w-full"
                onClick={() => handleModeSwitch('reset')}
              >
                Forgot your password?
              </button>
            )}
            
            {isResetPassword && (
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 text-sm block w-full"
                onClick={() => handleModeSwitch('signin')}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Features</span>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Schedule posts to Facebook, Instagram, LinkedIn
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Google Business Profile integration
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              AI-powered content generation
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}