import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUserId(session.user.id)
          setIsLoggedIn(true)
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        setIsLoggedIn(true)
      } else {
        setUserId(null)
        setIsLoggedIn(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">FriendTalk</h1>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return isLoggedIn && userId ? <HomePage userId={userId} /> : <AuthPage />
}

export default App
