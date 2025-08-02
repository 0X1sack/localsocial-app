import { useState, useEffect } from 'react'
import LandingPage from './components/LandingPage'
import OperationsDashboard from './components/OperationsDashboard'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('landing')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      try {
        const session = await auth.getCurrentSession()
        setUser(session?.user || null)
      } catch (error) {
        console.error('Error checking user session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      
      // Update view based on auth state
      if (session?.user) {
        // If user just signed in and we're on auth page, go to dashboard
        if (currentView === 'auth') {
          setCurrentView('dashboard')
        }
      } else {
        // If user signed out, go to landing page
        if (currentView === 'dashboard') {
          setCurrentView('landing')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [currentView])

  // Handle view changes
  const handleViewChange = (view) => {
    setCurrentView(view)
  }

  // Simple routing based on URL or state
  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    // Check URL for initial routing
    const path = window.location.pathname
    
    if (path === '/operations' || currentView === 'operations') {
      return <OperationsDashboard />
    }
    
    if (path === '/auth' || currentView === 'auth') {
      return <Auth />
    }
    
    if (path === '/dashboard' || (currentView === 'dashboard' && user)) {
      return <Dashboard user={user} onViewChange={handleViewChange} />
    }

    // Default to landing page
    return <LandingPage onViewChange={handleViewChange} user={user} />
  }

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  )
}

export default App
