// Post Queue System for LocalSocial
// Handles scheduled post processing, background simulation, and status tracking

import { facebookAPI, FacebookAPIError, RateLimitError } from './facebook'
import { db, supabase } from './supabase'

// Post processing statuses
export const POST_STATUS = {
  SCHEDULED: 'scheduled',
  PROCESSING: 'processing',
  POSTING: 'posting',
  POSTED: 'posted',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

// Error types for better error handling
export const ERROR_TYPES = {
  RATE_LIMIT: 'rate_limit',
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  INVALID_TOKEN: 'invalid_token',
  MISSING_ACCOUNT: 'missing_account',
  INVALID_CONTENT: 'invalid_content',
  UNKNOWN: 'unknown'
}

class PostQueueError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, retryable = false) {
    super(message)
    this.name = 'PostQueueError'
    this.type = type
    this.retryable = retryable
  }
}

// Queue processor class
class PostQueueProcessor {
  constructor() {
    this.isProcessing = false
    this.processInterval = null
    this.retryDelays = [30000, 60000, 300000, 900000] // 30s, 1m, 5m, 15m
    this.maxRetries = 3
    
    // Start processing on instantiation
    this.startProcessing()
  }

  /**
   * Start the background queue processor
   */
  startProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval)
    }
    
    // Process queue every 30 seconds
    this.processInterval = setInterval(() => {
      this.processQueue()
    }, 30000)
    
    // Also process immediately
    this.processQueue()
    
    console.log('Post queue processor started')
  }

  /**
   * Stop the background queue processor
   */
  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
    console.log('Post queue processor stopped')
  }

  /**
   * Process the queue - find and process due posts
   */
  async processQueue() {
    if (this.isProcessing) {
      return // Prevent concurrent processing
    }

    this.isProcessing = true

    try {
      // Get posts that are due for processing
      const duePosts = await this.getDuePosts()
      
      if (duePosts.length === 0) {
        return
      }

      console.log(`Processing ${duePosts.length} due posts`)

      // Process posts concurrently but with rate limiting
      const processingPromises = duePosts.map(post => 
        this.processPost(post).catch(error => {
          console.error(`Error processing post ${post.id}:`, error)
          return null // Don't let one failure stop others
        })
      )

      await Promise.all(processingPromises)

    } catch (error) {
      console.error('Error in queue processing:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Get posts that are due for processing
   */
  async getDuePosts() {
    try {
      // Get posts scheduled for now or earlier that haven't been processed
      const now = new Date().toISOString()
      
      // Query database for due posts
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          social_accounts (
            id,
            platform,
            account_id,
            access_token,
            is_active
          )
        `)
        .eq('status', POST_STATUS.SCHEDULED)
        .lte('scheduled_for', now)
        .eq('social_accounts.is_active', true)
        .limit(10) // Process max 10 posts at a time

      if (error) {
        throw new PostQueueError(`Failed to fetch due posts: ${error.message}`, ERROR_TYPES.UNKNOWN)
      }

      return data || []
    } catch (error) {
      console.error('Error getting due posts:', error)
      return []
    }
  }

  /**
   * Process a single post
   */
  async processPost(post) {
    const startTime = Date.now()
    
    try {
      // Update status to processing
      await this.updatePostStatus(post.id, POST_STATUS.PROCESSING)

      // Validate post data
      this.validatePost(post)

      // Process based on platform
      const result = await this.publishPost(post)

      // Update post with success status
      await this.updatePostStatus(post.id, POST_STATUS.POSTED, {
        platform_post_id: result.platform_post_id,
        error_message: null
      })

      const duration = Date.now() - startTime
      console.log(`Successfully posted to ${post.social_accounts.platform} (${duration}ms)`)

      return result

    } catch (error) {
      console.error(`Failed to process post ${post.id}:`, error)
      
      // Handle retries
      const shouldRetry = this.shouldRetryPost(post, error)
      
      if (shouldRetry) {
        await this.scheduleRetry(post, error)
      } else {
        await this.updatePostStatus(post.id, POST_STATUS.FAILED, {
          error_message: error.message
        })
      }

      throw error
    }
  }

  /**
   * Validate post data before processing
   */
  validatePost(post) {
    if (!post.social_accounts) {
      throw new PostQueueError('Social account not found', ERROR_TYPES.MISSING_ACCOUNT)
    }

    if (!post.social_accounts.is_active) {
      throw new PostQueueError('Social account is inactive', ERROR_TYPES.MISSING_ACCOUNT)
    }

    if (!post.content?.trim()) {
      throw new PostQueueError('Post content is empty', ERROR_TYPES.INVALID_CONTENT)
    }

    if (!post.social_accounts.access_token) {
      throw new PostQueueError('Access token missing', ERROR_TYPES.INVALID_TOKEN, true)
    }
  }

  /**
   * Publish post to the appropriate platform
   */
  async publishPost(post) {
    const { social_accounts: account } = post
    
    switch (account.platform) {
      case 'facebook':
        return await this.publishToFacebook(post, account)
      case 'instagram':
        return await this.publishToInstagram(post, account)
      default:
        throw new PostQueueError(`Unsupported platform: ${account.platform}`, ERROR_TYPES.UNKNOWN)
    }
  }

  /**
   * Publish to Facebook
   */
  async publishToFacebook(post, account) {
    try {
      // Validate token before posting
      const tokenValidation = await facebookAPI.validateToken(account.access_token)
      if (!tokenValidation.valid) {
        throw new PostQueueError('Facebook access token is invalid', ERROR_TYPES.INVALID_TOKEN, true)
      }

      let result
      
      // Check if post has media
      if (post.media_urls && post.media_urls.length > 0) {
        // Post with photo
        result = await facebookAPI.publishPagePhoto(account.account_id, account.access_token, {
          message: post.content,
          url: post.media_urls[0], // Use first media URL
          published: true
        })
      } else {
        // Text-only post
        result = await facebookAPI.publishPagePost(account.account_id, account.access_token, {
          message: post.content,
          published: true
        })
      }

      return {
        platform_post_id: result.id || result.post_id,
        platform: 'facebook'
      }

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new PostQueueError(error.message, ERROR_TYPES.RATE_LIMIT, true)
      } else if (error instanceof FacebookAPIError) {
        const retryable = error.code !== 'OAuthException' // Don't retry auth errors
        throw new PostQueueError(error.message, ERROR_TYPES.API_ERROR, retryable)
      } else {
        throw new PostQueueError(error.message, ERROR_TYPES.NETWORK_ERROR, true)
      }
    }
  }

  /**
   * Publish to Instagram
   */
  async publishToInstagram(post, account) {
    try {
      // Instagram requires media
      if (!post.media_urls || post.media_urls.length === 0) {
        throw new PostQueueError('Instagram posts require media', ERROR_TYPES.INVALID_CONTENT)
      }

      // Validate token
      const tokenValidation = await facebookAPI.validateToken(account.access_token)
      if (!tokenValidation.valid) {
        throw new PostQueueError('Instagram access token is invalid', ERROR_TYPES.INVALID_TOKEN, true)
      }

      // Step 1: Create media container
      const creationResult = await facebookAPI.createInstagramPost(account.account_id, account.access_token, {
        image_url: post.media_urls[0],
        caption: post.content,
        media_type: 'IMAGE'
      })

      // Step 2: Publish the media
      const publishResult = await facebookAPI.publishInstagramPost(
        account.account_id,
        creationResult.id,
        account.access_token
      )

      return {
        platform_post_id: publishResult.id,
        platform: 'instagram'
      }

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new PostQueueError(error.message, ERROR_TYPES.RATE_LIMIT, true)
      } else if (error instanceof FacebookAPIError) {
        const retryable = error.code !== 'OAuthException'
        throw new PostQueueError(error.message, ERROR_TYPES.API_ERROR, retryable)
      } else {
        throw new PostQueueError(error.message, ERROR_TYPES.NETWORK_ERROR, true)
      }
    }
  }

  /**
   * Determine if a post should be retried
   */
  shouldRetryPost(post, error) {
    // Don't retry if not retryable
    if (error instanceof PostQueueError && !error.retryable) {
      return false
    }

    // Don't retry if max retries reached
    const retryCount = post.retry_count || 0
    if (retryCount >= this.maxRetries) {
      return false
    }

    // Don't retry content validation errors
    if (error instanceof PostQueueError && error.type === ERROR_TYPES.INVALID_CONTENT) {
      return false
    }

    return true
  }

  /**
   * Schedule a post for retry
   */
  async scheduleRetry(post, error) {
    const retryCount = (post.retry_count || 0) + 1
    const delay = this.retryDelays[Math.min(retryCount - 1, this.retryDelays.length - 1)]
    const retryTime = new Date(Date.now() + delay)

    await db.updateScheduledPost(post.id, {
      status: POST_STATUS.SCHEDULED,
      scheduled_for: retryTime.toISOString(),
      retry_count: retryCount,
      error_message: `Retry ${retryCount}: ${error.message}`
    })

    console.log(`Scheduled retry ${retryCount} for post ${post.id} at ${retryTime.toISOString()}`)
  }

  /**
   * Update post status in database
   */
  async updatePostStatus(postId, status, additionalData = {}) {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    }

    const { error } = await db.updateScheduledPost(postId, updateData)
    
    if (error) {
      console.error(`Failed to update post ${postId} status:`, error)
      throw new PostQueueError(`Failed to update post status: ${error.message}`)
    }
  }
}

// Create singleton instance
const postQueueProcessor = new PostQueueProcessor()

// Queue management functions
export const postQueue = {
  /**
   * Add a new post to the queue
   */
  async addPost(userId, socialAccountId, postData) {
    try {
      const post = {
        user_id: userId,
        social_account_id: socialAccountId,
        content: postData.content,
        media_urls: postData.media_urls || [],
        scheduled_for: postData.scheduled_for,
        status: POST_STATUS.SCHEDULED,
        hashtags: postData.hashtags || [],
        location: postData.location || null
      }

      const { post: createdPost, error } = await db.createScheduledPost(post)
      
      if (error) {
        throw new PostQueueError(`Failed to create scheduled post: ${error.message}`)
      }

      console.log(`Added post to queue: ${createdPost.id}`)
      return createdPost

    } catch (error) {
      console.error('Error adding post to queue:', error)
      throw error
    }
  },

  /**
   * Get queue status for a user
   */
  async getQueueStatus(userId) {
    try {
      const { posts, error } = await db.getScheduledPosts(userId, 100)
      
      if (error) {
        throw new PostQueueError(`Failed to get queue status: ${error.message}`)
      }

      const statusCounts = posts.reduce((counts, post) => {
        counts[post.status] = (counts[post.status] || 0) + 1
        return counts
      }, {})

      return {
        total: posts.length,
        scheduled: statusCounts[POST_STATUS.SCHEDULED] || 0,
        processing: statusCounts[POST_STATUS.PROCESSING] || 0,
        posted: statusCounts[POST_STATUS.POSTED] || 0,
        failed: statusCounts[POST_STATUS.FAILED] || 0,
        cancelled: statusCounts[POST_STATUS.CANCELLED] || 0,
        posts: posts.slice(0, 20) // Return first 20 posts
      }
    } catch (error) {
      console.error('Error getting queue status:', error)
      throw error
    }
  },

  /**
   * Cancel a scheduled post
   */
  async cancelPost(postId, userId) {
    try {
      // Verify ownership
      const { posts } = await db.getScheduledPosts(userId)
      const post = posts.find(p => p.id === postId)
      
      if (!post) {
        throw new PostQueueError('Post not found or access denied', ERROR_TYPES.MISSING_ACCOUNT)
      }

      if (post.status === POST_STATUS.POSTED) {
        throw new PostQueueError('Cannot cancel already posted content', ERROR_TYPES.INVALID_CONTENT)
      }

      await db.updateScheduledPost(postId, {
        status: POST_STATUS.CANCELLED,
        error_message: 'Cancelled by user'
      })

      console.log(`Cancelled post: ${postId}`)
      return true

    } catch (error) {
      console.error('Error cancelling post:', error)
      throw error
    }
  },

  /**
   * Retry a failed post
   */
  async retryPost(postId, userId) {
    try {
      const { posts } = await db.getScheduledPosts(userId)
      const post = posts.find(p => p.id === postId)
      
      if (!post) {
        throw new PostQueueError('Post not found or access denied', ERROR_TYPES.MISSING_ACCOUNT)
      }

      if (post.status !== POST_STATUS.FAILED) {
        throw new PostQueueError('Only failed posts can be retried', ERROR_TYPES.INVALID_CONTENT)
      }

      // Reset post for immediate retry
      await db.updateScheduledPost(postId, {
        status: POST_STATUS.SCHEDULED,
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        error_message: null
      })

      console.log(`Reset post for retry: ${postId}`)
      return true

    } catch (error) {
      console.error('Error retrying post:', error)
      throw error
    }
  },

  /**
   * Get processor statistics
   */
  getProcessorStats() {
    return {
      isProcessing: postQueueProcessor.isProcessing,
      rateLimitStatus: facebookAPI.getRateLimitStatus(),
      maxRetries: postQueueProcessor.maxRetries,
      retryDelays: postQueueProcessor.retryDelays
    }
  },

  /**
   * Force process the queue (for testing)
   */
  async forceProcess() {
    return await postQueueProcessor.processQueue()
  }
}

// Export error classes
export { PostQueueError }

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    postQueueProcessor.stopProcessing()
  })
}

export default postQueue