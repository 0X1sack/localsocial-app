import { useState } from 'react'
import LandingPage from './components/LandingPage'
import OperationsDashboard from './components/OperationsDashboard'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('landing')

  // Simple routing based on URL or state
  const renderCurrentView = () => {
    if (window.location.pathname === '/operations' || currentView === 'operations') {
      return <OperationsDashboard />
    }
    return <LandingPage onShowAuth={() => setCurrentView('operations')} />
  }

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  )
}

export default App
