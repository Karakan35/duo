import React from 'react';

const GameOver = ({ user }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 solo-leveling-bg">
      <div className="max-w-md w-full text-center fade-in">
        <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-12 border-2 border-red-500/50 neon-border">
          <div className="text-8xl mb-6 animate-pulse">💀</div>
          <h1 className="text-6xl font-bold text-red-500 mb-4 neon-text">GAME OVER</h1>
          <p className="text-2xl text-gray-300 mb-2">
            {user.name}
          </p>
          <p className="text-lg text-red-400 mb-8">
            Tüm canların bitti. Hunter olarak başarısız oldun.
          </p>
          
          <div className="bg-gray-900/80 rounded-xl p-6 space-y-4 border border-gray-700">
            <div className="text-left">
              <div className="text-gray-400 text-sm mb-1">Son Seviye</div>
              <div className="text-3xl font-bold text-blue-400">{user.level}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
              <div className="text-left">
                <div className="text-gray-400 text-xs mb-1">Güç 💪</div>
                <div className="text-xl font-bold text-red-400">{user.strength || 10}</div>
              </div>
              <div className="text-left">
                <div className="text-gray-400 text-xs mb-1">Çeviklik ⚡</div>
                <div className="text-xl font-bold text-yellow-400">{user.agility || 10}</div>
              </div>
              <div className="text-left">
                <div className="text-gray-400 text-xs mb-1">Karizma ✨</div>
                <div className="text-xl font-bold text-pink-400">{user.charisma || 10}</div>
              </div>
              <div className="text-left">
                <div className="text-gray-400 text-xs mb-1">Dayanıklılık 🛡️</div>
                <div className="text-xl font-bold text-green-400">{user.endurance || 10}</div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mt-8">
            Oyun bitti. Sayfayı yenileyerek yeni bir maceraya başlayabilirsin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
