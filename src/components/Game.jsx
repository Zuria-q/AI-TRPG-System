import { useState, useEffect } from 'react';
import GameControlPanel from './GameControlPanel';
import WorldCardPanel from './WorldCardPanel';
import TRPGActionPanel from './TRPGActionPanel';
import CharacterEditor from './CharacterEditor';
import gameController from './game_controller';
import gameState from './game_state';

/**
 * 游戏主容器
 * 集成所有核心模块和UI面板
 */
export default function Game() {
  const [currentView, setCurrentView] = useState('game'); // game | worldbook
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [gameStatus, setGameStatus] = useState('ready'); // ready | playing | ended
  
  // 初始化游戏
  const initGame = () => {
    gameController.init();
    setGameStatus('playing');
  };
  
  // 处理玩家行动
  const handlePlayerAction = (action) => {
    gameController.processPlayerAction(action);
    
    // 检查游戏是否结束
    if (gameState.isGameEnded()) {
      setGameStatus('ended');
    }
  };
  
  // 自动保存
  useEffect(() => {
    if (gameStatus === 'playing') {
      const interval = setInterval(() => {
        gameController.autoSave();
      }, 30000); // 每30秒自动保存
      
      return () => clearInterval(interval);
    }
  }, [gameStatus]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      {/* 顶部导航 */}
      <header className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-bold">AI跑团叙事系统</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setCurrentView('game')}
            className={`px-4 py-2 rounded ${currentView === 'game' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            游戏模式
          </button>
          <button 
            onClick={() => setCurrentView('worldbook')}
            className={`px-4 py-2 rounded ${currentView === 'worldbook' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            世界书
          </button>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {currentView === 'game' ? (
          <>
            {/* 左侧控制面板 */}
            <div className="lg:col-span-1">
              <GameControlPanel 
                onSettingsChange={(settings) => gameController.updateSettings(settings)}
              />
            </div>
            
            {/* 中央游戏区 */}
            <div className="lg:col-span-2 space-y-4">
              {gameStatus === 'ready' && (
                <div className="p-6 bg-gray-800 rounded-lg text-center">
                  <h2 className="text-xl font-bold mb-4">欢迎来到AI跑团叙事系统</h2>
                  <button 
                    onClick={initGame}
                    className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    开始新游戏
                  </button>
                </div>
              )}
              
              {gameStatus === 'playing' && (
                <>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h2 className="text-lg font-semibold mb-2">当前场景</h2>
                    <p>{gameState.currentLocation.description}</p>
                  </div>
                  
                  <TRPGActionPanel 
                    onSubmit={handlePlayerAction}
                    onSelectAgent={setSelectedAgent}
                  />
                </>
              )}
              
              {gameStatus === 'ended' && (
                <div className="p-6 bg-gray-800 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">游戏结束</h2>
                  <button 
                    onClick={initGame}
                    className="px-4 py-2 bg-blue-600 rounded"
                  >
                    重新开始
                  </button>
                </div>
              )}
            </div>
            
            {/* 右侧角色信息 */}
            <div className="lg:col-span-1">
              {selectedAgent && (
                <CharacterEditor agentId={selectedAgent} />
              )}
            </div>
          </>
        ) : (
          /* 世界书模式 */
          <div className="lg:col-span-4">
            <WorldCardPanel />
          </div>
        )}
      </main>
    </div>
  );
}
