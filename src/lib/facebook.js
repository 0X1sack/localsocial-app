// Facebook API Service Layer for LocalSocial
// Handles Facebook Pages API integration, OAuth flow, and post publishing

class FacebookAPIError extends Error {
  constructor(message, code, type = 'FacebookAPIError') {
    super(message)
    this.name = type
    this.code = code
  }
}

class RateLimitError extends FacebookAPIError {
  constructor(message, retryAfter = null) {
    super(message, 'RATE_LIMIT_EXCEEDED', 'RateLimitError')
    this.retryAfter = retryAfter
  }
}

// Rate limiting tracker
const rateLimitTracker = {
  requests: 0,
  resetTime: Date.now() + (60 * 60 * 1000), // Reset every hour
  maxRequests: parseInt(import.meta.env.FACEBOOK_REQUESTS_PER_HOUR || '200'),
  
  checkLimit() {
    const now = Date.now()
    if (now > this.resetTime) {
      this.requests = 0
      this.resetTime = now + (60 * 60 * 1000)
    }
    
    if (this.requests >= this.maxRequests) {
      const waitTime = Math.ceil((this.resetTime - now) / 1000)
      throw new RateLimitError(`Rate limit exceeded. Try again in ${waitTime} seconds.`, waitTime)
    }
    
    this.requests++
  }
}

// Configuration
const config = {
  appId: import.meta.env.VITE_FACEBOOK_APP_ID,
  apiVersion: import.meta.env.VITE_FACEBOOK_API_VERSION || 'v19.0',
  baseUrl: `https://graph.facebook.com`,
  redirectUri: `${import.meta.env.VITE_BASE_URL || window.location.origin}/auth/facebook/callback`,
  scope: [
    'pages_show_list',           // Access user's pages
    'pages_read_engagement',     // Read page engagement
    'pages_manage_posts',        // Manage page posts
    'instagram_basic',           // Instagram basic access
    'instagram_content_publish', // Publish to Instagram
    'business_management'        // Business account access
  ].join(',')
}

if (!config.appId) {
  console.warn('Facebook App ID not configured. Facebook integration will not work.')
}

// Facebook API Service
export const facebookAPI = {
  // ==============================================
  // OAuth Flow Methods
  // ==============================================
  
  /**
   * Generate Facebook OAuth URL for user authentication
   * @param {string} state - CSRF protection state parameter
   * @returns {string} OAuth URL
   */
  getOAuthUrl(state) {
    if (!config.appId) {
      throw new FacebookAPIError('Facebook App ID not configured', 'MISSING_CONFIG')
    }
    
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state
    })
    
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  },

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<{access_token: string, token_type: string, expires_in: number}>}
   */
  async exchangeCodeForToken(code) {
    rateLimitTracker.checkLimit()
    
    const params = new URLSearchParams({
      client_id: config.appId,
      client_secret: import.meta.env.FACEBOOK_APP_SECRET,
      redirect_uri: config.redirectUri,
      code: code
    })
    
    try {
      const response = await fetch(`${config.baseUrl}/oauth/access_token?${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to exchange code for token',
          data.error?.code || 'TOKEN_EXCHANGE_FAILED'
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  /**
   * Get long-lived access token from short-lived token
   * @param {string} shortLivedToken - Short-lived access token
   * @returns {Promise<{access_token: string, token_type: string, expires_in: number}>}
   */
  async getLongLivedToken(shortLivedToken) {
    rateLimitTracker.checkLimit()
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: config.appId,
      client_secret: import.meta.env.FACEBOOK_APP_SECRET,
      fb_exchange_token: shortLivedToken
    })
    
    try {
      const response = await fetch(`${config.baseUrl}/oauth/access_token?${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to get long-lived token',
          data.error?.code || 'LONG_LIVED_TOKEN_FAILED'
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  // ==============================================
  // User and Pages Methods
  // ==============================================

  /**
   * Get user information
   * @param {string} accessToken - User access token
   * @returns {Promise<{id: string, name: string, email?: string}>}
   */
  async getUser(accessToken) {
    rateLimitTracker.checkLimit()
    
    try {
      const response = await fetch(
        `${config.baseUrl}/${config.apiVersion}/me?fields=id,name,email&access_token=${accessToken}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to get user info',
          data.error?.code || 'USER_INFO_FAILED'
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  /**
   * Get user's Facebook Pages
   * @param {string} accessToken - User access token
   * @returns {Promise<Array>} Array of page objects
   */
  async getUserPages(accessToken) {
    rateLimitTracker.checkLimit()
    
    try {
      const response = await fetch(
        `${config.baseUrl}/${config.apiVersion}/me/accounts?fields=id,name,access_token,category,tasks&access_token=${accessToken}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to get user pages',
          data.error?.code || 'PAGES_FETCH_FAILED'
        )
      }
      
      // Filter pages that have MANAGE and CREATE_CONTENT permissions
      const managablePages = data.data?.filter(page => 
        page.tasks?.includes('MANAGE') && page.tasks?.includes('CREATE_CONTENT')
      ) || []
      
      return managablePages
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  /**
   * Get Instagram Business Account connected to a Facebook Page
   * @param {string} pageId - Facebook Page ID
   * @param {string} pageAccessToken - Page access token
   * @returns {Promise<{id: string, username: string} | null>}
   */
  async getInstagramAccount(pageId, pageAccessToken) {
    rateLimitTracker.checkLimit()
    
    try {
      const response = await fetch(
        `${config.baseUrl}/${config.apiVersion}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        // Instagram account might not be connected - this is not necessarily an error
        if (data.error?.code === 100) {
          return null
        }
        throw new FacebookAPIError(
          data.error?.message || 'Failed to get Instagram account',
          data.error?.code || 'INSTAGRAM_FETCH_FAILED'
        )
      }
      
      if (!data.instagram_business_account) {
        return null
      }
      
      // Get Instagram account details
      const igResponse = await fetch(
        `${config.baseUrl}/${config.apiVersion}/${data.instagram_business_account.id}?fields=id,username&access_token=${pageAccessToken}`
      )
      const igData = await igResponse.json()
      
      if (!igResponse.ok) {
        throw new FacebookAPIError(
          igData.error?.message || 'Failed to get Instagram account details',
          igData.error?.code || 'INSTAGRAM_DETAILS_FAILED'
        )
      }
      
      return igData
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  // ==============================================
  // Publishing Methods
  // ==============================================

  /**
   * Publish a text post to Facebook Page
   * @param {string} pageId - Facebook Page ID
   * @param {string} pageAccessToken - Page access token
   * @param {Object} postData - Post content and options
   * @returns {Promise<{id: string}>} Published post ID
   */
  async publishPagePost(pageId, pageAccessToken, postData) {
    rateLimitTracker.checkLimit()
    
    const { message, link, published = true, scheduled_publish_time } = postData
    
    if (!message?.trim()) {
      throw new FacebookAPIError('Post message cannot be empty', 'EMPTY_MESSAGE')
    }
    
    const payload = {
      message: message.trim(),
      published: published ? 'true' : 'false',
      access_token: pageAccessToken
    }
    
    // Add optional fields
    if (link) payload.link = link
    if (scheduled_publish_time) {
      payload.published = 'false'
      payload.scheduled_publish_time = Math.floor(scheduled_publish_time / 1000) // Convert to Unix timestamp
    }
    
    try {
      const response = await fetch(
        `${config.baseUrl}/${config.apiVersion}/${pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString()
        }
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to publish post',
          data.error?.code || 'PUBLISH_FAILED'
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  /**
   * Publish a photo post to Facebook Page
   * @param {string} pageId - Facebook Page ID
   * @param {string} pageAccessToken - Page access token
   * @param {Object} postData - Post content and media
   * @returns {Promise<{id: string, post_id: string}>} Published post ID
   */
  async publishPagePhoto(pageId, pageAccessToken, postData) {
    rateLimitTracker.checkLimit()
    
    const { message, url, published = true, scheduled_publish_time } = postData
    
    if (!url) {
      throw new FacebookAPIError('Photo URL is required', 'MISSING_PHOTO_URL')
    }
    
    const payload = {
      url: url,
      published: published ? 'true' : 'false',
      access_token: pageAccessToken
    }
    
    // Add optional fields
    if (message?.trim()) payload.caption = message.trim()
    if (scheduled_publish_time) {
      payload.published = 'false'
      payload.scheduled_publish_time = Math.floor(scheduled_publish_time / 1000)
    }
    
    try {
      const response = await fetch(
        `${config.baseUrl}/${config.apiVersion}/${pageId}/photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString()
        }
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to publish photo',
          data.error?.code || 'PHOTO_PUBLISH_FAILED'
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  /**
   * Publish to Instagram (requires Instagram Business Account)
   * @param {string} instagramAccountId - Instagram Business Account ID
   * @param {string} pageAccessToken - Connected Facebook Page access token
   * @param {Object} postData - Post content and media
   * @returns {Promise<{id: string}>} Creation ID (need to publish separately)
   */
  async createInstagramPost(instagramAccountId, pageAccessToken, postData) {
    rateLimitTracker.checkLimit()
    
    const { image_url, caption, media_type = 'IMAGE' } = postData
    
    if (!image_url) {
      throw new FacebookAPIError('Image URL is required for Instagram posts', 'MISSING_IMAGE_URL')
    }
    
    const payload = {
      image_url: image_url,
      media_type: media_type,
      access_token: pageAccessToken
    }
    
    if (caption?.trim()) payload.caption = caption.trim()
    
    try {
      // Step 1: Create the media container
      const createResponse = await fetch(
        `${config.baseUrl}/${config.apiVersion}/${instagramAccountId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString()
        }
      )
      
      const createData = await createResponse.json()
      
      if (!createResponse.ok) {
        throw new FacebookAPIError(
          createData.error?.message || 'Failed to create Instagram media',
          createData.error?.code || 'INSTAGRAM_CREATE_FAILED'
        )
      }
      
      return createData
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  /**
   * Publish Instagram media container
   * @param {string} instagramAccountId - Instagram Business Account ID
   * @param {string} creationId - Media container ID from createInstagramPost
   * @param {string} pageAccessToken - Connected Facebook Page access token
   * @returns {Promise<{id: string}>} Published post ID
   */
  async publishInstagramPost(instagramAccountId, creationId, pageAccessToken) {
    rateLimitTracker.checkLimit()
    
    const payload = {
      creation_id: creationId,
      access_token: pageAccessToken
    }
    
    try {
      const response = await fetch(
        `${config.baseUrl}/${config.apiVersion}/${instagramAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString()
        }
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new FacebookAPIError(
          data.error?.message || 'Failed to publish Instagram media',
          data.error?.code || 'INSTAGRAM_PUBLISH_FAILED'
        )
      }
      
      return data
    } catch (error) {
      if (error instanceof FacebookAPIError) throw error
      throw new FacebookAPIError(`Network error: ${error.message}`, 'NETWORK_ERROR')
    }
  },

  // ==============================================
  // Utility Methods
  // ==============================================

  /**
   * Validate access token
   * @param {string} accessToken - Access token to validate
   * @returns {Promise<{valid: boolean, expires_at?: number, scopes?: Array}>}
   */
  async validateToken(accessToken) {
    rateLimitTracker.checkLimit()
    
    try {
      const response = await fetch(
        `${config.baseUrl}/debug_token?input_token=${accessToken}&access_token=${config.appId}|${import.meta.env.FACEBOOK_APP_SECRET}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        return { valid: false }
      }
      
      return {
        valid: data.data?.is_valid || false,
        expires_at: data.data?.expires_at,
        scopes: data.data?.scopes
      }
    } catch (error) {
      return { valid: false }
    }
  },

  /**
   * Get rate limit status
   * @returns {Object} Current rate limit status
   */
  getRateLimitStatus() {
    const now = Date.now()
    const remaining = Math.max(0, rateLimitTracker.maxRequests - rateLimitTracker.requests)
    const resetIn = rateLimitTracker.resetTime > now ? Math.ceil((rateLimitTracker.resetTime - now) / 1000) : 0
    
    return {
      requests: rateLimitTracker.requests,
      remaining,
      maxRequests: rateLimitTracker.maxRequests,
      resetIn,
      resetTime: rateLimitTracker.resetTime
    }
  }
}

// Export error classes for external use
export { FacebookAPIError, RateLimitError }

// Export default
export default facebookAPI