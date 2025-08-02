import { useState } from 'react'
import LandingPage from './components/LandingPage'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('landing')

  return (
    <div className="App">
      <LandingPage />
    </div>
  )
}

export default App