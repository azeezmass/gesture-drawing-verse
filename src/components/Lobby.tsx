
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

interface LobbyProps {
  onCreateRoom: (roomName: string, playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  const handleCreateRoom = () => {
    if (playerName.trim() && roomName.trim()) {
      onCreateRoom(roomName.trim(), playerName.trim());
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(roomCode.trim(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-purple-200">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-purple-900">GestureVerse</CardTitle>
          <CardDescription className="text-purple-700">
            A Drawing Game with Hand Gestures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <Input
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 w-1/2 text-center ${
                activeTab === "create"
                  ? "border-b-2 border-purple-500 text-purple-700 font-medium"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("create")}
            >
              Create Room
            </button>
            <button
              className={`px-4 py-2 w-1/2 text-center ${
                activeTab === "join"
                  ? "border-b-2 border-purple-500 text-purple-700 font-medium"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("join")}
            >
              Join Room
            </button>
          </div>

          {activeTab === "create" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name
                </label>
                <Input
                  id="roomName"
                  placeholder="Enter room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateRoom}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!playerName.trim() || !roomName.trim()}
              >
                Create Room
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Code
                </label>
                <Input
                  id="roomCode"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </div>
              <Button
                onClick={handleJoinRoom}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!playerName.trim() || !roomCode.trim()}
              >
                Join Room
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500">
          Wave your hand to draw! No mouse needed.
        </CardFooter>
      </Card>
    </div>
  );
};

export default Lobby;
