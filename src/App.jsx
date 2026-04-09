import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AccessibilityProvider } from './contexts/AccessibilityContext.jsx'
import { supabase } from './lib/supabase.js'
import AccessibilityBar from './components/AccessibilityBar.jsx'
import Home from './pages/Home.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ExerciseCreate from './pages/ExerciseCreate.jsx'
import StudentView from './pages/StudentView.jsx'
import Guide from './pages/Guide.jsx'
import NotFound from './pages/NotFound.jsx'

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-blue-600 text-lg animate-pulse">Chargement…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/connexion" replace />
  }

  return children
}

export default function App() {
  return (
    <AccessibilityProvider>
      <div className="min-h-screen">
        <AccessibilityBar />
        <div className="pt-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/connexion" element={<Auth />} />
            <Route
              path="/tableau-de-bord"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercice/creer"
              element={
                <ProtectedRoute>
                  <ExerciseCreate />
                </ProtectedRoute>
              }
            />
            <Route path="/exercice/:token" element={<StudentView />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </AccessibilityProvider>
  )
}
