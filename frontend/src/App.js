import { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import GameOver from './components/GameOver';
import RewardModal from './components/RewardModal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [reward, setReward] = useState(null);

  const handleLogin = async (userName) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/login`, { name: userName });
      const { user: userData, game_over } = response.data;
      
      if (game_over) {
        setUser({ ...userData, game_over: true });
      } else {
        setUser(userData);
        // Check daily health
        await checkDailyHealth(userData.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  const checkDailyHealth = async (userId) => {
    try {
      const response = await axios.post(`${API}/daily-check?user_id=${userId}`);
      const { health_reduced, new_health, game_over } = response.data;
      
      if (health_reduced) {
        toast.warning(`Dün görev yapmadın! Can: ${new_health}`);
        setUser(prev => ({ ...prev, health: new_health, game_over }));
      }
      
      if (game_over) {
        setUser(prev => ({ ...prev, game_over: true }));
      }
    } catch (error) {
      console.error('Daily check error:', error);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API}/users/${user.id}`);
      setUser(response.data);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const handleTaskComplete = async (reward) => {
    if (reward) {
      setReward(reward);
    }
    await refreshUser();
  };

  if (!user) {
    return (
      <div className="App">
        <LoginScreen onLogin={handleLogin} loading={loading} />
        <Toaster position="top-center" />
      </div>
    );
  }

  if (user.game_over) {
    return (
      <div className="App">
        <GameOver user={user} />
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard 
        user={user} 
        onTaskComplete={handleTaskComplete}
        onRefreshUser={refreshUser}
      />
      
      {user.is_admin && (
        <>
          <button
            onClick={() => {
              console.log('Admin button clicked!');
              setShowAdminPanel(true);
            }}
            className="fixed bottom-20 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-40"
            data-testid="admin-panel-button"
            style={{position: 'fixed', bottom: '80px', right: '24px', zIndex: 9999}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          {showAdminPanel && (
            <AdminPanel 
              user={user} 
              onClose={() => {
                console.log('Closing admin panel');
                setShowAdminPanel(false);
              }}
              onTaskCreated={refreshUser}
            />
          )}
        </>
      )}
      
      {reward && (
        <RewardModal 
          reward={reward} 
          onClose={() => setReward(null)} 
        />
      )}
      
      <Toaster position="top-center" />
    </div>
  );
}

export default App;