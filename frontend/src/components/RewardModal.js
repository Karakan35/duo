import React from 'react';

const RewardModal = ({ reward, onClose }) => {
  if (!reward) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-w-md w-full p-12 text-center fade-in border-2 border-blue-500/50 neon-border relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect background */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="text-8xl mb-6 animate-pulse">
            {reward.is_big ? '🏆' : '⚡'}
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-3 neon-text">
            {reward.is_big ? 'LEVEL UP!' : 'LEVEL UP!'}
          </h2>
          
          <h3 className="text-2xl font-bold text-blue-400 mb-4">
            {reward.title}
          </h3>
          
          <p className="text-lg text-gray-300 mb-6">
            {reward.description}
          </p>
          
          {reward.is_big && (
            <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white py-4 px-6 rounded-lg font-bold text-xl mb-6 animate-pulse border-2 border-yellow-400">
              🌟 BÜYÜK ÖDÜL 🌟
            </div>
          )}
          
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105 border-2 border-blue-400/50"
            data-testid="close-reward-modal"
          >
            Devam Et →
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardModal;