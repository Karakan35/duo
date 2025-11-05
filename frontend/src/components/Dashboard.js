import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onTaskComplete, onRefreshUser }) => {
  const [dailyTasks, setDailyTasks] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState('');
  const [completingTask, setCompletingTask] = useState(null);
  const [showWeeklyReminder, setShowWeeklyReminder] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [user.id]);

  const loadTasks = async () => {
    try {
      // Load daily tasks
      const dailyResponse = await axios.get(`${API}/tasks/today?user_id=${user.id}`);
      setDailyTasks(dailyResponse.data.tasks);
      setCurrentDay(dailyResponse.data.day);
      
      // Load weekly tasks
      const weeklyResponse = await axios.get(`${API}/tasks/weekly?user_id=${user.id}`);
      setWeeklyTasks(weeklyResponse.data.tasks);
      
      // Check if all daily tasks are completed
      const allDailyCompleted = dailyResponse.data.tasks.every(t => t.is_completed);
      const hasIncompleteWeekly = weeklyResponse.data.tasks.some(t => !t.is_completed);
      
      if (allDailyCompleted && hasIncompleteWeekly && dailyResponse.data.tasks.length > 0) {
        setShowWeeklyReminder(true);
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      toast.error('Görevler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Check if all tasks are completed
  const allTasksCompleted = () => {
    const hasDailyTasks = dailyTasks.length > 0;
    const hasWeeklyTasks = weeklyTasks.length > 0;
    const allDailyDone = dailyTasks.every(t => t.is_completed);
    const allWeeklyDone = weeklyTasks.every(t => t.is_completed);
    
    return (hasDailyTasks || hasWeeklyTasks) && 
           (!hasDailyTasks || allDailyDone) && 
           (!hasWeeklyTasks || allWeeklyDone);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      loadTasks(),
      onRefreshUser()
    ]);
    toast.success('Yenilendi!');
  };

  const handleCompleteTask = async (taskId) => {
    setCompletingTask(taskId);
    try {
      const response = await axios.post(`${API}/tasks/complete`, {
        user_id: user.id,
        task_id: taskId
      });
      
      const { success, stats, level_up, new_level, reward } = response.data;
      
      if (success) {
        const task = [...dailyTasks, ...weeklyTasks].find(t => t.id === taskId);
        const statGains = [];
        if (task.strength > 0) statGains.push(`+${task.strength} Güç`);
        if (task.agility > 0) statGains.push(`+${task.agility} Çeviklik`);
        if (task.charisma > 0) statGains.push(`+${task.charisma} Karizma`);
        if (task.endurance > 0) statGains.push(`+${task.endurance} Dayanıklılık`);
        
        if (statGains.length > 0) {
          toast.success(`Görev tamamlandı! ${statGains.join(', ')}`);
        } else {
          toast.success('Görev tamamlandı!');
        }
        
        if (level_up) {
          toast.success(`🎉 Seviye ${new_level}! ${reward?.title}`);
          onTaskComplete(reward);
        } else {
          onTaskComplete(null);
        }
        
        await loadTasks();
      }
    } catch (error) {
      console.error('Complete task error:', error);
      toast.error(error.response?.data?.detail || 'Görev tamamlanamadı');
    } finally {
      setCompletingTask(null);
    }
  };

  const renderHealthBar = () => {
    const hearts = [];
    for (let i = 0; i < 15; i++) {
      hearts.push(
        <span key={i} className="text-2xl">
          {i < user.health ? '❤️' : '💔'}
        </span>
      );
    }
    return hearts;
  };

  const StatBar = ({ label, value, icon, color }) => (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm text-gray-300 font-medium">{label}</span>
        </div>
        <span className={`text-xl font-bold ${color}`}>{value}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} bg-gradient-to-r from-transparent via-current to-transparent`}
          style={{ width: `${Math.min((value / 5000) * 100, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 solo-leveling-bg">
      <div className="max-w-6xl mx-auto">
        {/* Header with Stats */}
        <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-blue-500/30 neon-border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 neon-text">{user.name === 'Agamemnon' ? '⚔️' : '🗡️'} {user.name}</h1>
              <p className="text-blue-300 text-lg">{currentDay}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 p-2 rounded-lg transition-all border border-red-500/30"
                data-testid="logout-button"
                title="Ana sayfaya dön"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 p-2 rounded-lg transition-all border border-blue-500/30 disabled:opacity-50"
                data-testid="refresh-button"
                title="Yenile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
              <div className="text-blue-300 text-sm mb-1">Seviye</div>
              <div className="text-3xl font-bold text-white neon-text" data-testid="user-level">{user.level}</div>
            </div>
            <div className="bg-red-900/20 rounded-xl p-4 border border-red-500/30">
              <div className="text-red-300 text-sm mb-2">Can: {user.health}/15</div>
              <div className="flex flex-wrap gap-1" data-testid="health-bar">
                {renderHealthBar()}
              </div>
            </div>
          </div>
          
          {/* Character Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatBar label="Güç" value={user.strength || 10} icon="💪" color="text-red-400" />
            <StatBar label="Çeviklik" value={user.agility || 10} icon="⚡" color="text-yellow-400" />
            <StatBar label="Karizma" value={user.charisma || 10} icon="✨" color="text-pink-400" />
            <StatBar label="Dayanıklılık" value={user.endurance || 10} icon="🛡️" color="text-green-400" />
          </div>
        </div>
        
        {/* Weekly Reminder */}
        {showWeeklyReminder && (
          <div className="bg-yellow-900/20 backdrop-blur-lg rounded-2xl p-4 mb-6 border border-yellow-500/50 animate-pulse">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-yellow-300 font-bold text-lg">Haftalık Görevleri Unutmayın!</h3>
                <p className="text-yellow-200/80 text-sm">Ne kadar erken yaparsanız o kadar rahat edersiniz. Hafta sonu canınız gidebilir!</p>
              </div>
              <button 
                onClick={() => setShowWeeklyReminder(false)}
                className="ml-auto text-yellow-300 hover:text-yellow-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Daily Tasks */}
        <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-blue-500/30">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            Günlük Görevler
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : dailyTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Bugün için görev yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-4 flex items-center justify-between transition-all border ${
                    task.is_completed ? 'opacity-50 border-green-500/30' : 'border-blue-500/30 hover:border-blue-500/60'
                  }`}
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      task.is_completed ? 'bg-green-500 border-green-500' : 'border-blue-400'
                    }`}>
                      {task.is_completed && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{task.title}</div>
                      <div className="text-sm text-gray-400 flex items-center flex-wrap gap-2 mt-1">
                        {task.strength > 0 && <span className="text-red-400 bg-red-900/20 px-2 py-0.5 rounded">💪+{task.strength}</span>}
                        {task.agility > 0 && <span className="text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded">⚡+{task.agility}</span>}
                        {task.charisma > 0 && <span className="text-pink-400 bg-pink-900/20 px-2 py-0.5 rounded">✨+{task.charisma}</span>}
                        {task.endurance > 0 && <span className="text-green-400 bg-green-900/20 px-2 py-0.5 rounded">🛡️+{task.endurance}</span>}
                      </div>
                    </div>
                  </div>
                  
                  {!task.is_completed && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTask === task.id}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-green-400/50"
                      data-testid={`complete-task-${task.id}`}
                    >
                      {completingTask === task.id ? 'Yükleniyor...' : 'Tamamla!'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* All Tasks Completed Celebration */}
        {!loading && allTasksCompleted() && (
          <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 backdrop-blur-lg rounded-2xl p-8 border-2 border-green-500/50 mb-6 animate-pulse">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <span className="text-6xl">🎉</span>
              <span className="text-6xl">⚔️</span>
              <span className="text-6xl">🏆</span>
            </div>
            <h2 className="text-3xl font-bold text-white text-center mb-3 neon-text">
              TEBRİKLER!
            </h2>
            <p className="text-xl text-green-300 text-center mb-4">
              Bütün görevleri tamamladın!
            </p>
            <p className="text-lg text-gray-300 text-center">
              Seviye atlama yolunda emin adımlarla ilerliyorsun. {currentDay === 'Pazar' ? 'Bugün Pazar, görev tamamladın ve seviye atladın! 🎊' : 'Pazar gününü bekliyoruz! 🌟'}
            </p>
            <div className="flex justify-center mt-6 space-x-2">
              <div className="bg-green-600/20 px-4 py-2 rounded-lg border border-green-500/30">
                <span className="text-green-400 font-bold">✨ Mükemmel Performans</span>
              </div>
              <div className="bg-blue-600/20 px-4 py-2 rounded-lg border border-blue-500/30">
                <span className="text-blue-400 font-bold">💪 Güçlü Hunter</span>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Tasks */}
        {weeklyTasks.length > 0 && (
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">📅</span>
              Haftalık Görevler
              <span className="ml-3 text-sm text-purple-300 bg-purple-900/30 px-3 py-1 rounded-full">
                Bu hafta içinde tamamla
              </span>
            </h2>
            
            <div className="space-y-3">
              {weeklyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl p-4 flex items-center justify-between transition-all border ${
                    task.is_completed ? 'opacity-50 border-green-500/30' : 'border-purple-500/30 hover:border-purple-500/60'
                  }`}
                  data-testid={`weekly-task-${task.id}`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      task.is_completed ? 'bg-green-500 border-green-500' : 'border-purple-400'
                    }`}>
                      {task.is_completed && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{task.title}</div>
                      <div className="text-sm text-gray-400 flex items-center flex-wrap gap-2 mt-1">
                        {task.strength > 0 && <span className="text-red-400 bg-red-900/20 px-2 py-0.5 rounded">💪+{task.strength}</span>}
                        {task.agility > 0 && <span className="text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded">⚡+{task.agility}</span>}
                        {task.charisma > 0 && <span className="text-pink-400 bg-pink-900/20 px-2 py-0.5 rounded">✨+{task.charisma}</span>}
                        {task.endurance > 0 && <span className="text-green-400 bg-green-900/20 px-2 py-0.5 rounded">🛡️+{task.endurance}</span>}
                      </div>
                    </div>
                  </div>
                  
                  {!task.is_completed && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTask === task.id}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-400/50"
                      data-testid={`complete-weekly-task-${task.id}`}
                    >
                      {completingTask === task.id ? 'Yükleniyor...' : 'Tamamla!'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
