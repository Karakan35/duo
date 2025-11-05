import React from 'react';

const BELLATRIX_IMAGE = "https://customer-assets.emergentagent.com/job_turkish-chat-205/artifacts/c0bkm7sq_indir.jpg";
const AGAMEMNON_IMAGE = "https://customer-assets.emergentagent.com/job_turkish-chat-205/artifacts/mxcwgicf_BARUH.jpg";

const LoginScreen = ({ onLogin, loading }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 solo-leveling-bg">
      <div className="max-w-5xl w-full space-y-8 fade-in">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 neon-text">
            ⚔️ DUO LEVELING
          </h1>
          <p className="text-2xl text-blue-300 mb-2">Hunter Selection</p>
          <p className="text-lg text-gray-400">Kim giriş yapıyor?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bellatrix - Rogue */}
          <button
            onClick={() => onLogin('Bellatrix')}
            disabled={loading}
            className="group relative bg-black/40 backdrop-blur-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed character-portrait"
            data-testid="login-bellatrix-button"
          >
            <div className="aspect-[3/4] relative">
              <img 
                src={BELLATRIX_IMAGE}
                alt="Bellatrix - Rogue"
                className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                style={{objectPosition: 'center top'}}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x500/1a1a2e/3b82f6?text=Bellatrix';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
              <div className="text-xs text-purple-400 font-semibold mb-1 tracking-widest">ROGUE</div>
              <div className="text-4xl font-bold text-white mb-2 neon-text">Bellatrix</div>
              <div className="flex items-center space-x-2 text-red-400">
                <span className="text-2xl">❤️</span>
                <span className="text-xl font-bold">13 HP</span>
              </div>
              <div className="mt-2 text-sm text-gray-300">Agile & Deadly</div>
            </div>
          </button>
          
          {/* Agamemnon - Barbarian */}
          <button
            onClick={() => onLogin('Agamemnon')}
            disabled={loading}
            className="group relative bg-black/40 backdrop-blur-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed character-portrait"
            data-testid="login-agamemnon-button"
          >
            <div className="aspect-[3/4] relative">
              <img 
                src={AGAMEMNON_IMAGE}
                alt="Agamemnon - Barbarian"
                className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x500/1a1a2e/ef4444?text=Agamemnon';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
              <div className="text-xs text-red-400 font-semibold mb-1 tracking-widest">BARBARIAN</div>
              <div className="text-4xl font-bold text-white mb-2 neon-text">Agamemnon</div>
              <div className="flex items-center space-x-2 text-red-400">
                <span className="text-2xl">❤️</span>
                <span className="text-xl font-bold">14 HP</span>
              </div>
              <div className="mt-2 text-sm text-gray-300">Strong & Fearless</div>
            </div>
          </button>
        </div>
        
        {loading && (
          <div className="text-center mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent glow-animation"></div>
            <p className="text-blue-300 mt-4">Loading Hunter Data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
