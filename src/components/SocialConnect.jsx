import { useState, useEffect } from 'react'
import { facebookAPI, FacebookAPIError, RateLimitError } from '../lib/facebook'
import { auth, db } from '../lib/supabase'

// Generate random state for CSRF protection
const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export default function SocialConnect({ user, onAccountsUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [connectingFacebook, setConnectingFacebook] = useState(false)

  // Load connected accounts on mount
  useEffect(() => {
    if (user?.id) {
      loadConnectedAccounts()
    }
  }, [user?.id])

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')
      
      if (error) {
        setError(`Facebook authorization failed: ${error}`)
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      if (code && state) {
        const storedState = localStorage.getItem('oauth_state')
        if (state !== storedState) {
          setError('Invalid OAuth state. Please try again.')
          window.history.replaceState({}, document.title, window.location.pathname)
          return
        }
        
        await processFacebookOAuth(code)
        // Clean up
        localStorage.removeItem('oauth_state')
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    handleOAuthCallback()
  }, [])

  const loadConnectedAccounts = async () => {
    try {
      const { accounts, error } = await db.getSocialAccounts(user.id)
      if (error) {
        console.error('Error loading accounts:', error)
        return
      }
      setConnectedAccounts(accounts || [])
      if (onAccountsUpdate) {
        onAccountsUpdate(accounts || [])
      }
    } catch (err) {
      console.error('Error loading connected accounts:', err)
    }
  }

  const processFacebookOAuth = async (code) => {
    setConnectingFacebook(true)
    setError('')
    setSuccess('')

    try {
      // Step 1: Exchange code for access token
      const tokenResponse = await facebookAPI.exchangeCodeForToken(code)
      
      // Step 2: Get long-lived token
      const longLivedToken = await facebookAPI.getLongLivedToken(tokenResponse.access_token)
      
      // Step 3: Get user info
      const userInfo = await facebookAPI.getUser(longLivedToken.access_token)
      
      // Step 4: Get user's pages
      const pages = await facebookAPI.getUserPages(longLivedToken.access_token)
      
      if (pages.length === 0) {
        setError('No manageable Facebook Pages found. Please ensure you have admin access to at least one Facebook Page.')
        return
      }

      // Step 5: Store each page as a separate social account
      const addedAccounts = []
      for (const page of pages) {
        try {
          // Check for Instagram connection
          const instagramAccount = await facebookAPI.getInstagramAccount(page.id, page.access_token)
          
          // Calculate expiry date (long-lived tokens typically last 60 days)
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 60)

          // Add Facebook Page account
          const { account: fbAccount, error: fbError } = await db.addSocialAccount({
            user_id: user.id,
            platform: 'facebook',
            account_id: page.id,
            account_name: page.name,
            access_token: page.access_token,
            expires_at: expiresAt.toISOString(),
            is_active: true
          })

          if (fbError) {
            console.error('Error adding Facebook account:', fbError)
            continue
          }

          addedAccounts.push(fbAccount)

          // Add Instagram account if connected
          if (instagramAccount) {
            const { account: igAccount, error: igError } = await db.addSocialAccount({
              user_id: user.id,
              platform: 'instagram',
              account_id: instagramAccount.id,
              account_name: `@${instagramAccount.username}`,
              access_token: page.access_token, // Instagram uses the Page token
              expires_at: expiresAt.toISOString(),
              is_active: true
            })

            if (!igError && igAccount) {
              addedAccounts.push(igAccount)
            }
          }
        } catch (err) {
          console.error(`Error processing page ${page.name}:`, err.message)
        }
      }

      if (addedAccounts.length > 0) {
        setSuccess(`Successfully connected ${addedAccounts.length} account(s)!`)
        await loadConnectedAccounts()
      } else {
        setError('Failed to connect any accounts. Please try again.')
      }

    } catch (err) {
      console.error('Facebook OAuth error:', err)
      
      if (err instanceof RateLimitError) {
        setError(`Rate limit exceeded. Please try again in ${err.retryAfter || 60} seconds.`)
      } else if (err instanceof FacebookAPIError) {
        setError(`Facebook API Error: ${err.message}`)
      } else {
        setError(`Connection failed: ${err.message}`)
      }
    } finally {
      setConnectingFacebook(false)
    }
  }

  const handleFacebookConnect = () => {
    try {
      setError('')
      setSuccess('')
      
      // Generate and store state for CSRF protection
      const state = generateState()
      localStorage.setItem('oauth_state', state)
      
      // Redirect to Facebook OAuth
      const oauthUrl = facebookAPI.getOAuthUrl(state)
      window.location.href = oauthUrl
      
    } catch (err) {
      setError(`Configuration error: ${err.message}`)
    }
  }

  const handleDisconnectAccount = async (accountId, accountName) => {
    if (!confirm(`Are you sure you want to disconnect ${accountName}?`)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await db.updateSocialAccount(accountId, { is_active: false })
      
      if (error) {
        setError('Failed to disconnect account. Please try again.')
        return
      }

      setSuccess(`${accountName} has been disconnected.`)
      await loadConnectedAccounts()
      
    } catch (err) {
      setError(`Failed to disconnect account: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook':
        return (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">f</span>
          </div>
        )
      case 'instagram':
        return (
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">IG</span>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">?</span>
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Connect Social Media Accounts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Connect your Facebook Pages and Instagram Business accounts to start scheduling posts.
          </p>
        </div>

        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Connected Accounts */}
          {connectedAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Connected Accounts</h3>
              <div className="space-y-3">
                {connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{account.account_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.platform}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnectAccount(account.id, account.account_name)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connect New Accounts */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">Connect New Account</h3>
            
            {/* Facebook Connect Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">f</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Facebook Pages</h4>
                    <p className="text-xs text-gray-500">Connect your Facebook Pages and Instagram Business accounts</p>
                  </div>
                </div>
                <button
                  onClick={handleFacebookConnect}
                  disabled={connectingFacebook}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectingFacebook ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Rate Limit Info */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Make sure you're an admin of the Facebook Pages you want to connect. 
                    Instagram Business accounts must be linked to a Facebook Page to work with our platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}