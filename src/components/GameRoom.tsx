
import React, { useState, useEffect } from "react";
import DrawingCanvas from "./DrawingCanvas";
import HandTracker from "./HandTracker";
import { HandLandmark, GestureType } from "@/lib/gestures";
import { Card } from "@/components/ui/card";

// Mock word list for the game
const WORDS = [
  "apple", "house", "tree", "car", "dog", "cat", "book", "flower", 
  "sun", "moon", "star", "cloud", "mountain", "river", "ocean", "forest"
];

interface Player {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
}

interface GameRoomProps {
  roomCode: string;
  roomName: string;
  playerId: string;
  playerName: string;
  onLeaveRoom: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({
  roomCode,
  roomName,
  playerId,
  playerName,
  onLeaveRoom
}) => {
  // Game state
  const [players, setPlayers] = useState<Player[]>([
    { id: playerId, name: playerName, score: 0, isActive: true },
    // Mock other players for demo
    { id: "player2", name: "AI Player 1", score: 0, isActive: false },
    { id: "player3", name: "AI Player 2", score: 0, isActive: false }
  ]);
  
  const [isDrawer, setIsDrawer] = useState<boolean>(true);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [handLandmarks, setHandLandmarks] = useState<HandLandmark[]>([]);
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "round-end" | "game-end">("waiting");
  
  // Start new round
  useEffect(() => {
    if (gameStatus === "waiting") {
      const timer = setTimeout(() => {
        // Randomly select a drawer (for demo, always the main player)
        setIsDrawer(true);
        
        // Pick a random word
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        setCurrentWord(randomWord);
        
        // Set round timer
        setTimeLeft(60);
        
        // Start the game
        setGameStatus("playing");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gameStatus]);
  
  // Round timer
  useEffect(() => {
    if (gameStatus !== "playing") return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameStatus("round-end");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStatus]);
  
  // Round end logic
  useEffect(() => {
    if (gameStatus === "round-end") {
      const timer = setTimeout(() => {
        if (roundNumber >= 3) {
          setGameStatus("game-end");
        } else {
          setRoundNumber(roundNumber + 1);
          setGameStatus("waiting");
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [gameStatus, roundNumber]);
  
  // Handle gesture detection
  const handleGestureDetected = (landmarks: HandLandmark[], gesture: GestureType) => {
    setHandLandmarks(landmarks);
    setCurrentGesture(gesture);
  };
  
  // Mock function to simulate a correct guess from an AI player
  useEffect(() => {
    if (gameStatus === "playing" && isDrawer) {
      const randomGuessTime = Math.random() * 30000 + 15000; // Random time between 15-45 seconds
      
      const guessTimer = setTimeout(() => {
        if (gameStatus === "playing") {
          // Update score for a random player
          setPlayers(prevPlayers => {
            const newPlayers = [...prevPlayers];
            const randomPlayerIndex = Math.floor(Math.random() * (newPlayers.length - 1)) + 1;
            newPlayers[randomPlayerIndex].score += Math.floor((timeLeft / 60) * 100);
            return newPlayers;
          });
          
          setGameStatus("round-end");
        }
      }, randomGuessTime);
      
      return () => clearTimeout(guessTimer);
    }
  }, [gameStatus, isDrawer]);
  
  // Format time for display
  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Room info header */}
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-purple-900">{roomName}</h2>
            <p className="text-sm text-gray-600">Room Code: {roomCode}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 px-3 py-1 rounded-full text-purple-800 font-medium">
              Round {roundNumber}/3
            </div>
            <div className="bg-purple-100 px-3 py-1 rounded-full text-purple-800 font-medium">
              Time: {formatTime(timeLeft)}
            </div>
            <button 
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
              onClick={onLeaveRoom}
            >
              Leave Room
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Players sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 h-full">
              <h3 className="text-lg font-medium mb-4">Players</h3>
              <div className="space-y-2">
                {players.map((player) => (
                  <div 
                    key={player.id} 
                    className={`flex justify-between items-center p-2 rounded-lg ${
                      player.id === playerId ? 'bg-purple-100 border border-purple-300' : 'bg-gray-50'
                    } ${player.isActive ? 'font-semibold' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {isDrawer && player.id === playerId && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500 text-white rounded-full">
                          Drawing
                        </span>
                      )}
                      <span>{player.name}</span>
                    </div>
                    <span className="font-semibold">{player.score}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Drawing area */}
            <Card className="p-4">
              {gameStatus === "waiting" ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">Get ready!</h3>
                    <p className="text-gray-600">New round starting soon...</p>
                  </div>
                </div>
              ) : gameStatus === "playing" ? (
                <div className="space-y-4">
                  {isDrawer && (
                    <div className="bg-yellow-100 border border-yellow-300 p-2 rounded text-center">
                      Draw: <span className="font-bold">{currentWord}</span>
                    </div>
                  )}
                  <div className="h-96">
                    <DrawingCanvas 
                      handLandmarks={handLandmarks}
                      gesture={currentGesture}
                      isActiveDrawer={isDrawer}
                    />
                  </div>
                </div>
              ) : gameStatus === "round-end" ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">Round Over!</h3>
                    <p className="text-lg">The word was: <span className="font-bold">{currentWord}</span></p>
                    <p className="text-gray-600 mt-2">Next round starting soon...</p>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">Game Over!</h3>
                    <p className="text-gray-600 mb-4">Final Scores:</p>
                    <div className="space-y-1">
                      {[...players].sort((a, b) => b.score - a.score).map((player, index) => (
                        <div key={player.id} className="flex justify-between items-center">
                          <span>{index + 1}. {player.name}</span>
                          <span className="font-semibold">{player.score}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      onClick={() => {
                        setRoundNumber(1);
                        setGameStatus("waiting");
                      }}
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}
            </Card>
            
            {/* Hand video */}
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Your Hand</h3>
              <div className="h-48">
                <HandTracker 
                  onGestureDetected={handleGestureDetected} 
                  showVideo={true}
                  enabled={gameStatus === "playing"}
                />
              </div>
              <div className="mt-2 text-sm text-gray-500 text-center">
                {isDrawer ? "Use your index finger to draw" : "Make guesses in the chat"}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
