import { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { postQueue } from '../lib/postQueue'
import SocialConnect from './SocialConnect'
import { CalendarIcon, PlusIcon, Cog6ToothIcon, UserCircleIcon } from '@heroicons/react/24/outline'

export default function Dashboard({ user, profile, onSignOut, onProfileUpdate }) {
  const [posts, setPosts] = useState([])
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [queueStatus, setQueueStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'connect', 'create'

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPosts(),
        loadConnectedAccounts(),
        loadQueueStatus()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      const { posts, error } = await db.getScheduledPosts(user.id, 20)
      if (error) throw error
      setPosts(posts || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    }
  }

  const loadConnectedAccounts = async () => {
    try {
      const { accounts, error } = await db.getSocialAccounts(user.id)
      if (error) throw error
      setConnectedAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading connected accounts:', error)
    }
  }

  const loadQueueStatus = async () => {
    try {
      const status = await postQueue.getQueueStatus(user.id)
      setQueueStatus(status)
    } catch (error) {
      console.error('Error loading queue status:', error)
    }
  }

  const handleAccountsUpdate = (accounts) => {
    setConnectedAccounts(accounts)
    // Refresh dashboard data when accounts are updated
    loadDashboardData()
  }

  const getPostStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'posting': return 'bg-orange-100 text-orange-800'
      case 'posted': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show SocialConnect view
  if (currentView === 'connect') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  ← Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Connect Social Accounts</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {profile?.business_name || user.email}
                </span>
                <button
                  onClick={onSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="py-6">
          <SocialConnect user={user} onAccountsUpdate={handleAccountsUpdate} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">LocalSocial</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {profile?.business_name || 'Business'}
                </div>
                <div className="text-xs text-gray-500">
                  {profile?.full_name || user.email}
                </div>
              </div>
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <button
                onClick={onSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Scheduled Posts
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {queueStatus?.scheduled || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Cog6ToothIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Connected Accounts
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {connectedAccounts.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 text-green-400">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Posted Successfully
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {queueStatus?.posted || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 text-red-400">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Failed Posts
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {queueStatus?.failed || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Warning */}
          {connectedAccounts.length === 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Connect your social media accounts</strong> to start scheduling and posting content automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                disabled={connectedAccounts.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Post
              </button>
              <button 
                onClick={() => setCurrentView('connect')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center"
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                {connectedAccounts.length > 0 ? 'Manage' : 'Connect'} Social Accounts
              </button>
            </div>
          </div>

          {/* Posts List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Posts
              </h3>
              
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled posts</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {connectedAccounts.length === 0 
                      ? 'Connect your social media accounts first, then create your first post.'
                      : 'Get started by creating your first social media post.'
                    }
                  </p>
                  {connectedAccounts.length > 0 && (
                    <div className="mt-6">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Create Post
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {post.social_accounts && (
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  post.social_accounts.platform === 'facebook' ? 'bg-blue-600' :
                                  post.social_accounts.platform === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                  'bg-gray-400'
                                }`}></div>
                                <span className="text-xs text-gray-500 capitalize">
                                  {post.social_accounts.platform}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                  {post.social_accounts.account_name}
                                </span>
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">
                            {post.content.length > 100 ? `${post.content.substring(0, 100)}...` : post.content}
                          </h4>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                              Scheduled: {new Date(post.scheduled_for).toLocaleString()}
                            </span>
                            {post.hashtags && post.hashtags.length > 0 && (
                              <span>
                                Tags: {post.hashtags.slice(0, 2).join(', ')}
                                {post.hashtags.length > 2 && ` +${post.hashtags.length - 2} more`}
                              </span>
                            )}
                          </div>
                          {post.error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {post.error_message}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPostStatusColor(post.status)}`}>
                            {post.status === 'scheduled' ? 'Scheduled' :
                             post.status === 'processing' ? 'Processing' :
                             post.status === 'posting' ? 'Posting...' :
                             post.status === 'posted' ? 'Posted' :
                             post.status === 'failed' ? 'Failed' :
                             post.status === 'cancelled' ? 'Cancelled' :
                             post.status}
                          </span>
                          {post.status === 'failed' && (
                            <button
                              onClick={() => postQueue.retryPost(post.id, user.id)}
                              className="text-blue-600 hover:text-blue-500 text-xs font-medium"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}