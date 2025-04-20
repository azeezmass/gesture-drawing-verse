# GestureVerse: Multiplayer Drawing Game using Hand Gestures

GestureVerse is an interactive drawing game that uses hand gesture recognition to enable players to draw on a virtual canvas without traditional input devices. This project combines real-time hand tracking technology with a multiplayer game environment.

## Features

- **Hand Gesture Drawing**: Draw on a canvas using just your hand movements
- **Multiplayer Gameplay**: Create or join game rooms with other players
- **Turn-Based Gameplay**: Players take turns drawing words while others guess
- **Simple UI**: Clean, intuitive interface focused on the drawing experience

## Technologies Used

- **React** - Frontend UI framework
- **TypeScript** - Type-safe JavaScript
- **MediaPipe** - Hand tracking and gesture recognition
- **Tailwind CSS** - Styling
- **Canvas API** - For drawing functionality

## Getting Started

### Prerequisites

- Modern web browser with camera access (Chrome recommended)
- Node.js & npm installed

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
```

2. Navigate to the project directory:
```sh
cd <YOUR_PROJECT_NAME>
```

3. Install dependencies:
```sh
npm install
```

4. Start the development server:
```sh
npm run dev
```

## How to Play

1. **Join or Create Room**: Enter a room name to create a new game or join with a room code
2. **Drawing Phase**: Use your index finger to draw the given word when it's your turn
3. **Guessing Phase**: Try to guess what other players are drawing
4. **Score Points**: Earn points based on correct guesses and the speed of your guesses

## Gesture Controls

- **Point with Index Finger**: Draw on the canvas
- **Pinch Index Finger & Thumb**: Erase mode (not fully implemented in demo)
- **Close Hand**: Stop drawing (not fully implemented in demo)

## Demo Mode

If you don't have a camera or experience issues with MediaPipe:

- Use the "Demo Mode" to test the game with simulated hand tracking
- Toggle between camera and demo mode using the button in the hand tracking view

## Project Structure

- `src/components/` - React components for UI
- `src/lib/` - Core utilities and gesture recognition logic
- `src/pages/` - Main application pages

## Future Enhancements

- Advanced gesture recognition
- Real-time multiplayer with Socket.io or WebRTC
- Customizable drawing tools
- User profiles and persistent scores
- Mobile device optimization

## Deployment

This project can be deployed using Vercel, Netlify, or any other React-compatible hosting service.

## License

This project is available under the MIT License.
