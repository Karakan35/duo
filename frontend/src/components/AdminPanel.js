import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAYS = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar'
];

const AdminPanel = ({ user, onClose, onTaskCreated }) => {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'rewards', or 'health'
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    points: 10,
    strength: 0,
    agility: 0,
    charisma: 0,
    endurance: 0,
    is_weekly: false,
    day_of_week: 'Pazartesi',
    assigned_to: 'both',
    add_to_all_days: false
  });
  const [editingReward, setEditingReward] = useState(null);
  const [previewReward, setPreviewReward] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadTasks();
    } else if (activeTab === 'rewards') {
      loadRewards();
    } else if (activeTab === 'health') {
      loadAllUsers();
    }
  }, [activeTab]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tasks/week?user_id=${user.id}`);
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Load tasks error:', error);
      toast.error('Görevler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadRewards = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/rewards?user_id=${user.id}`);
      setRewards(response.data.rewards);
    } catch (error) {
      console.error('Load rewards error:', error);
      toast.error('Ödüller yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users/all/list?user_id=${user.id}`);
      setAllUsers(response.data.users);
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Görev adı gerekli');
      return;
    }

    setSubmitting(true);
    try {
      const taskData = {
        ...newTask,
        assigned_to: newTask.assigned_to === 'both' ? null : newTask.assigned_to
      };

      // If "add to all days" is checked, create 7 tasks (one for each day)
      if (newTask.add_to_all_days && !newTask.is_weekly) {
        let successCount = 0;
        for (const day of DAYS) {
          try {
            await axios.post(`${API}/tasks?user_id=${user.id}`, {
              ...taskData,
              day_of_week: day
            });
            successCount++;
          } catch (error) {
            console.error(`Error adding task for ${day}:`, error);
          }
        }
        toast.success(`${successCount} görev eklendi (tüm günler için)!`);
      } else {
        // Single task
        await axios.post(`${API}/tasks?user_id=${user.id}`, taskData);
        toast.success('Görev eklendi!');
      }

      setNewTask({ 
        title: '', 
        points: 10, 
        strength: 0,
        agility: 0,
        charisma: 0,
        endurance: 0,
        is_weekly: false,
        day_of_week: 'Pazartesi',
        assigned_to: 'both',
        add_to_all_days: false
      });
      await loadTasks();
      onTaskCreated();
    } catch (error) {
      console.error('Create task error:', error);
      toast.error('Görev eklenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await axios.post(`${API}/tasks/${taskId}/delete?user_id=${user.id}`);
      toast.success('Görev silindi');
      await loadTasks();
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error('Görev silinemedi');
    }
  };

  const handleSaveReward = async (rewardData) => {
    try {
      await axios.post(`${API}/rewards?user_id=${user.id}`, rewardData);
      toast.success('Ödül kaydedildi!');
      setEditingReward(null);
      await loadRewards();
    } catch (error) {
      console.error('Save reward error:', error);
      toast.error('Ödül kaydedilemedi');
    }
  };

  const handleDeleteReward = async (level) => {
    if (!window.confirm(`Seviye ${level} ödülünü silmek istediğinizden emin misiniz?`)) {
      return;
    }
    try {
      await axios.delete(`${API}/rewards/${level}?user_id=${user.id}`);
      toast.success('Ödül silindi');
      await loadRewards();
    } catch (error) {
      console.error('Delete reward error:', error);
      toast.error('Ödül silinemedi');
    }
  };

  const handleUpdateHealth = async (targetUserId, newHealth) => {
    try {
      const response = await axios.post(`${API}/users/${targetUserId}/health?user_id=${user.id}`, {
        health: parseInt(newHealth)
      });
      
      if (response.data.success) {
        toast.success(`Can güncellendi: ${response.data.new_health}/15`);
        if (!response.data.game_over) {
          toast.success('Karakter kurtarıldı! Oyun devam edebilir 🎮');
        }
        await loadAllUsers();
        onTaskCreated(); // Refresh main dashboard
      }
    } catch (error) {
      console.error('Update health error:', error);
      toast.error('Can güncellenemedi');
    }
  };

  const groupTasksByType = () => {
    const daily = {};
    const weekly = [];
    
    DAYS.forEach(day => {
      daily[day] = [];
    });
    
    tasks.forEach(t => {
      if (t.is_weekly) {
        weekly.push(t);
      } else if (t.day_of_week) {
        daily[t.day_of_week].push(t);
      }
    });
    
    return { daily, weekly };
  };

  const { daily: tasksByDay, weekly: weeklyTasks } = groupTasksByType();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border-2 border-blue-500/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold neon-text">⚙️ Admin Panel</h2>
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-lg transition-all"
              data-testid="close-admin-panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🎯 Görevler
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'rewards'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🏆 Ödüller
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'health'
                  ? 'bg-white text-red-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              ❤️ Can Yönetimi
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'tasks' && (
            <>
              {/* Add Task Form */}
              <div className="p-6 border-b border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">🎯 Yeni Görev Ekle</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Type Toggle */}
              <div className="flex items-center space-x-4 bg-gray-800/50 p-3 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, is_weekly: false })}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !newTask.is_weekly 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📅 Günlük Görev
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, is_weekly: true })}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    newTask.is_weekly 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📆 Haftalık Görev
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Görev Adı</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Örn: 30dk Koşu"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="task-title-input"
                  />
                </div>
                
                {/* Character Assignment */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Kim İçin?</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="both">Her İkisi İçin</option>
                    <option value="user_bellatrix">🗡️ Bellatrix (Rogue)</option>
                    <option value="user_agamemnon">⚔️ Agamemnon (Barbarian)</option>
                  </select>
                </div>
                
                {/* Day Selection (only for daily tasks) */}
                {!newTask.is_weekly && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Gün</label>
                      <select
                        value={newTask.day_of_week}
                        onChange={(e) => setNewTask({ ...newTask, day_of_week: e.target.value })}
                        disabled={newTask.add_to_all_days}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="task-day-select"
                      >
                        {DAYS.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Add to All Days Checkbox */}
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTask.add_to_all_days}
                          onChange={(e) => setNewTask({ ...newTask, add_to_all_days: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-300 font-medium">
                          📅 Tüm günlere ekle (Pazartesi-Pazar)
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-7">
                        Bu görev haftanın 7 gününe de ayrı ayrı eklenecek
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-red-400 mb-1">Güç 💪</label>
                  <input
                    type="number"
                    value={newTask.strength}
                    onChange={(e) => setNewTask({ ...newTask, strength: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-800 border border-red-900/50 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-400 mb-1">Çeviklik ⚡</label>
                  <input
                    type="number"
                    value={newTask.agility}
                    onChange={(e) => setNewTask({ ...newTask, agility: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-800 border border-yellow-900/50 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-pink-400 mb-1">Karizma ✨</label>
                  <input
                    type="number"
                    value={newTask.charisma}
                    onChange={(e) => setNewTask({ ...newTask, charisma: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-800 border border-pink-900/50 rounded-lg text-white focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-1">Dayanıklılık 🛡️</label>
                  <input
                    type="number"
                    value={newTask.endurance}
                    onChange={(e) => setNewTask({ ...newTask, endurance: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-800 border border-green-900/50 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="add-task-button"
              >
                {submitting ? 'Ekleniyor...' : 'Görev Ekle'}
              </button>
            </form>
          </div>

          {/* Task Lists */}
          <div className="p-6 space-y-6">
            {/* Weekly Tasks */}
            {weeklyTasks.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-purple-300 mb-4">📆 Haftalık Görevler</h3>
                <div className="space-y-2">
                  {weeklyTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between bg-purple-900/20 rounded-lg p-3 border border-purple-500/30"
                      data-testid={`admin-task-${task.id}`}
                    >
                      <div>
                        <span className="font-medium text-white">{task.title}</span>
                        <span className="text-sm text-gray-400 ml-2 flex items-center gap-1">
                          {task.strength > 0 && <span className="text-red-400">💪{task.strength}</span>}
                          {task.agility > 0 && <span className="text-yellow-400">⚡{task.agility}</span>}
                          {task.charisma > 0 && <span className="text-pink-400">✨{task.charisma}</span>}
                          {task.endurance > 0 && <span className="text-green-400">🛡️{task.endurance}</span>}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition-all"
                        data-testid={`delete-task-${task.id}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Daily Tasks */}
            <div>
              <h3 className="text-xl font-bold text-blue-300 mb-4">📅 Günlük Görevler</h3>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS.map(day => (
                    <div key={day} className="border border-gray-800 rounded-lg p-4 bg-gray-900/50">
                      <h4 className="font-bold text-gray-300 mb-2">{day}</h4>
                      {tasksByDay[day].length === 0 ? (
                        <p className="text-gray-500 text-sm">Görev yok</p>
                      ) : (
                        <div className="space-y-2">
                          {tasksByDay[day].map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                              data-testid={`admin-task-${task.id}`}
                            >
                              <div>
                                <span className="font-medium text-white">{task.title}</span>
                                <span className="text-sm text-gray-400 ml-2 inline-flex items-center gap-1">
                                  {task.strength > 0 && <span className="text-red-400">💪{task.strength}</span>}
                                  {task.agility > 0 && <span className="text-yellow-400">⚡{task.agility}</span>}
                                  {task.charisma > 0 && <span className="text-pink-400">✨{task.charisma}</span>}
                                  {task.endurance > 0 && <span className="text-green-400">🛡️{task.endurance}</span>}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition-all"
                                data-testid={`delete-task-${task.id}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </>
          )}
          
          {activeTab === 'rewards' && (
            /* Rewards Tab */
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">🏆 Seviye Ödülleri</h3>
                <button
                  onClick={() => setEditingReward({ level: rewards.length + 1, title: '', description: '', is_big: false })}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700"
                >
                  + Yeni Ödül
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rewards.map((reward) => (
                    <div
                      key={reward.level}
                      className={`bg-gray-800/50 rounded-lg p-4 border ${
                        reward.is_big ? 'border-yellow-500/50' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{reward.is_big ? '🏆' : '⚡'}</span>
                          <div>
                            <div className="text-blue-400 font-bold">Seviye {reward.level}</div>
                            {reward.is_big && (
                              <div className="text-xs text-yellow-400 font-semibold">BÜYÜK ÖDÜL</div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setPreviewReward(reward)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Önizle"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingReward(reward)}
                            className="text-green-400 hover:text-green-300 p-1"
                            title="Düzenle"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteReward(reward.level)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Sil"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-white font-semibold">{reward.title}</div>
                      <div className="text-gray-400 text-sm mt-1">{reward.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'health' && (
            /* Health Management Tab */
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">❤️ Can Yönetimi</h3>
                <p className="text-gray-400 text-sm">
                  Karakterlere can ekleyerek oyunu kurtarabilirsiniz. Game over durumundaki karakterler de canlandırılabilir.
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {allUsers.map((character) => (
                    <div
                      key={character.id}
                      className={`bg-gradient-to-r rounded-xl p-6 border-2 transition-all ${
                        character.game_over
                          ? 'from-red-900/40 to-gray-900/40 border-red-500/50'
                          : 'from-gray-800/50 to-gray-900/50 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">
                            {character.name === 'Agamemnon' ? '⚔️' : '🗡️'}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xl font-bold text-white">{character.name}</h4>
                              {character.is_admin && (
                                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">Admin</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              Seviye {character.level} • {character.name === 'Agamemnon' ? 'Barbarian' : 'Rogue'}
                            </div>
                          </div>
                        </div>
                        
                        {character.game_over && (
                          <div className="bg-red-600/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg font-bold animate-pulse">
                            💀 GAME OVER
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-black/40 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Güç</div>
                          <div className="text-red-400 font-bold">💪 {character.strength || 10}</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Çeviklik</div>
                          <div className="text-yellow-400 font-bold">⚡ {character.agility || 10}</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Karizma</div>
                          <div className="text-pink-400 font-bold">✨ {character.charisma || 10}</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Dayanıklılık</div>
                          <div className="text-green-400 font-bold">🛡️ {character.endurance || 10}</div>
                        </div>
                      </div>

                      {/* Health Bar */}
                      <div className="bg-black/40 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300 font-medium">Can: {character.health}/15</span>
                          <div className="flex space-x-1">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <span key={i} className="text-xl">
                                {i < character.health ? '❤️' : '💔'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              character.health > 10
                                ? 'bg-green-500'
                                : character.health > 5
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(character.health / 15) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Health Controls */}
                      <div className="bg-black/40 rounded-lg p-4">
                        <label className="block text-gray-300 font-medium mb-2">
                          Can Güncelle (0-15)
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="15"
                            defaultValue={character.health}
                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            id={`health-${character.id}`}
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(`health-${character.id}`);
                              handleUpdateHealth(character.id, input.value);
                            }}
                            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                          >
                            Güncelle
                          </button>
                          <button
                            onClick={() => handleUpdateHealth(character.id, 15)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                            title="Full Heal"
                          >
                            ⚡ Max
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Reward Modal */}
        {editingReward && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditingReward(null)}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-4">Ödül Düzenle</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Seviye</label>
                  <input
                    type="number"
                    value={editingReward.level}
                    onChange={(e) => setEditingReward({ ...editingReward, level: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={editingReward.title}
                    onChange={(e) => setEditingReward({ ...editingReward, title: e.target.value })}
                    placeholder="Örn: Seviye Atlama Ödülü"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
                  <textarea
                    value={editingReward.description}
                    onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                    placeholder="Örn: Seviye 5'e ulaştın! 🎉"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-24"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_big"
                    checked={editingReward.is_big}
                    onChange={(e) => setEditingReward({ ...editingReward, is_big: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="is_big" className="text-gray-300">Büyük Ödül (5'in katları için)</label>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSaveReward(editingReward)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingReward(null)}
                    className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-semibold"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Reward Modal */}
        {previewReward && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => setPreviewReward(null)}>
            <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-w-md w-full p-12 text-center fade-in border-2 border-blue-500/50 neon-border relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="text-8xl mb-6 animate-pulse">
                  {previewReward.is_big ? '🏆' : '⚡'}
                </div>
                
                <h2 className="text-4xl font-bold text-white mb-3 neon-text">
                  LEVEL UP!
                </h2>
                
                <h3 className="text-2xl font-bold text-blue-400 mb-4">
                  {previewReward.title}
                </h3>
                
                <p className="text-lg text-gray-300 mb-6">
                  {previewReward.description}
                </p>
                
                {previewReward.is_big && (
                  <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white py-4 px-6 rounded-lg font-bold text-xl mb-6 animate-pulse border-2 border-yellow-400">
                    🌟 BÜYÜK ÖDÜL 🌟
                  </div>
                )}
                
                <button
                  onClick={() => setPreviewReward(null)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105 border-2 border-blue-400/50"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
