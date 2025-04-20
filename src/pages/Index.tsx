
import React, { useState, useEffect } from "react";
import Lobby from "@/components/Lobby";
import GameRoom from "@/components/GameRoom";

// Generate a random ID for local player
const generateId = () => Math.random().toString(36).substring(2, 9);

const Index = () => {
  // App states
  const [currentScreen, setCurrentScreen] = useState<"lobby" | "game">("lobby");
  const [playerId] = useState<string>(generateId());
  const [playerName, setPlayerName] = useState<string>("");
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");

  // Handle create room
  const handleCreateRoom = (name: string, player: string) => {
    // Generate a random code for the room
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    setRoomCode(code);
    setRoomName(name);
    setPlayerName(player);
    setCurrentScreen("game");
  };

  // Handle join room
  const handleJoinRoom = (code: string, player: string) => {
    // In a real app, we would verify if the room exists
    setRoomCode(code);
    setRoomName(`Room ${code}`); // This would come from server in a real app
    setPlayerName(player);
    setCurrentScreen("game");
  };

  // Handle leaving the room
  const handleLeaveRoom = () => {
    setCurrentScreen("lobby");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {currentScreen === "lobby" ? (
        <Lobby 
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <GameRoom
          roomCode={roomCode}
          roomName={roomName}
          playerId={playerId}
          playerName={playerName}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
};

export default Index;
