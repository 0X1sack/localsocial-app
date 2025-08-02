import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use actual values directly for production
const actualUrl = 'https://ssnuecmlhreonttbvcry.supabase.co'
const actualKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzbnVlY21saHJlb250dGJ2Y3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQ3NDEsImV4cCI6MjA2OTY5MDc0MX0.opoe4qcZGzlxtTN-D9NUMRtW6mNO0e4wc75x-ZCX6G8'

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || actualUrl, 
  supabaseAnonKey || actualKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const auth = {
  // Get current session
  getCurrentSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      console.error('Error getting session:', error.message)
      return null
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      console.error('Error getting user:', error.message)
      return null
    }
  },

  // Sign up with email and password
  signUp: async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Error signing up:', error.message)
      return { user: null, error }
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Error signing in:', error.message)
      return { user: null, session: null, error }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error.message)
      return { error }
    }
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error resetting password:', error.message)
      return { data: null, error }
    }
  },

  // Update password
  updatePassword: async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Error updating password:', error.message)
      return { user: null, error }
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helper functions
export const db = {
  // Get user profile
  getProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error('Error getting profile:', error.message)
      return { profile: null, error }
    }
  },

  // Create or update user profile
  upsertProfile: async (profile) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single()
      
      if (error) throw error
      return { profile: data, error: null }
    } catch (error) {
      console.error('Error upserting profile:', error.message)
      return { profile: null, error }
    }
  },

  // Get user's social accounts
  getSocialAccounts: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { accounts: data, error: null }
    } catch (error) {
      console.error('Error getting social accounts:', error.message)
      return { accounts: [], error }
    }
  },

  // Add social account
  addSocialAccount: async (account) => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .insert(account)
        .select()
        .single()
      
      if (error) throw error
      return { account: data, error: null }
    } catch (error) {
      console.error('Error adding social account:', error.message)
      return { account: null, error }
    }
  },

  // Update social account
  updateSocialAccount: async (accountId, updates) => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .update(updates)
        .eq('id', accountId)
        .select()
        .single()
      
      if (error) throw error
      return { account: data, error: null }
    } catch (error) {
      console.error('Error updating social account:', error.message)
      return { account: null, error }
    }
  },

  // Get scheduled posts
  getScheduledPosts: async (userId, limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          social_accounts (platform, account_name)
        `)
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: true })
        .limit(limit)
      
      if (error) throw error
      return { posts: data, error: null }
    } catch (error) {
      console.error('Error getting scheduled posts:', error.message)
      return { posts: [], error }
    }
  },

  // Create scheduled post
  createScheduledPost: async (post) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert(post)
        .select()
        .single()
      
      if (error) throw error
      return { post: data, error: null }
    } catch (error) {
      console.error('Error creating scheduled post:', error.message)
      return { post: null, error }
    }
  },

  // Update scheduled post
  updateScheduledPost: async (postId, updates) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single()
      
      if (error) throw error
      return { post: data, error: null }
    } catch (error) {
      console.error('Error updating scheduled post:', error.message)
      return { post: null, error }
    }
  }
}