import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline'

export default function OperationsDashboard() {
  const [metrics, setMetrics] = useState({
    revenue: {
      current: 0,
      target: 100000,
      monthly: 0,
      growth: 0
    },
    users: {
      total: 0,
      active: 0,
      signups: 0,
      conversion: 0
    },
    posts: {
      scheduled: 0,
      published: 0,
      failed: 0,
      success_rate: 0
    },
    system: {
      uptime: 100,
      response_time: 0,
      errors: 0,
      deployments: 0
    }
  })

  const [tasks, setTasks] = useState([
    { id: 1, name: 'Setup Supabase Database', status: 'pending', priority: 'high', agent: 'DATABASE_ARCHITECT' },
    { id: 2, name: 'Deploy to Production', status: 'pending', priority: 'high', agent: 'DEVOPS_SPECIALIST' },
    { id: 3, name: 'Facebook API Integration', status: 'pending', priority: 'high', agent: 'API_DEVELOPER' },
    { id: 4, name: 'User Onboarding Flow', status: 'pending', priority: 'high', agent: 'FRONTEND_ARCHITECT' },
    { id: 5, name: 'Payment Processing Setup', status: 'pending', priority: 'medium', agent: 'BACKEND_ARCHITECT' }
  ])

  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), level: 'info', message: 'Operations dashboard initialized', agent: 'SYSTEM' },
    { time: new Date().toLocaleTimeString(), level: 'info', message: 'Development server started on port 5175', agent: 'DEVOPS' },
    { time: new Date().toLocaleTimeString(), level: 'warning', message: 'Supabase credentials not configured', agent: 'DATABASE' }
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update metrics randomly to simulate real activity
      setMetrics(prev => ({
        ...prev,
        system: {
          ...prev.system,
          response_time: Math.floor(Math.random() * 200) + 50,
          uptime: 99.9 + Math.random() * 0.1
        }
      }))

      // Add random log entries
      const logMessages = [
        'Health check completed successfully',
        'Database connection verified',
        'API endpoint response: 200ms',
        'User session created',
        'Post scheduled successfully'
      ]
      
      if (Math.random() > 0.7) {
        const newLog = {
          time: new Date().toLocaleTimeString(),
          level: 'info',
          message: logMessages[Math.floor(Math.random() * logMessages.length)],
          agent: ['SYSTEM', 'DATABASE', 'API', 'FRONTEND'][Math.floor(Math.random() * 4)]
        }
        setLogs(prev => [newLog, ...prev.slice(0, 9)])
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      default: return 'text-green-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Revenue Generation Operations</h1>
              <p className="text-sm text-gray-600">Real-time monitoring and control center</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-medium">System Online</span>
              </div>
              <div className="text-sm text-gray-600">
                Target: $100K | Current: ${metrics.revenue.current.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Revenue Generated</dt>
                    <dd className="text-lg font-medium text-gray-900">${metrics.revenue.current.toLocaleString()}</dd>
                    <dd className="text-sm text-gray-600">Target: $100,000</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{metrics.users.active}</dd>
                    <dd className="text-sm text-gray-600">Total: {metrics.users.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Posts Success Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{metrics.posts.success_rate.toFixed(1)}%</dd>
                    <dd className="text-sm text-gray-600">Published: {metrics.posts.published}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">System Uptime</dt>
                    <dd className="text-lg font-medium text-gray-900">{metrics.system.uptime.toFixed(2)}%</dd>
                    <dd className="text-sm text-gray-600">Response: {metrics.system.response_time}ms</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Task Management */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Active Operations</h3>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1 rounded ${getStatusColor(task.status)}`}>
                        {task.status === 'completed' ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : task.status === 'failed' ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : task.status === 'in_progress' ? (
                          <PlayCircleIcon className="h-4 w-4" />
                        ) : (
                          <ClockIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{task.name}</p>
                        <p className="text-xs text-gray-600">Agent: {task.agent}</p>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Logs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Logs</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">{log.time}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.level === 'error' ? 'bg-red-100 text-red-800' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-blue-600 font-medium">{log.agent}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 ml-2 mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Deploy to Production
              </button>
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Run Tests
              </button>
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Check API Health
              </button>
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}