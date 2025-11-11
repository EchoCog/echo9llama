# Deep Tree Echo - Source Directory

This directory contains the Node.js client implementation for the Deep Tree Echo Cognitive Tokamak system.

## 🌳 Architecture

The system implements the **Agent-Arena-Relation (AAR)** protocol as the core orchestration mechanism for Deep Tree Echo's embodied cognition framework.

### Components

#### `index.js` - Main Entry Point
The primary application entry point that:
- Initializes the Deep Tree Echo cognitive system
- Establishes WebSocket connections to the backend
- Manages the AAR protocol lifecycle
- Handles graceful shutdown and error recovery

#### `agent/connection-manager.js` - Connection Manager
Handles all network communications:
- **WebSocket Management**: Real-time bidirectional communication
- **HTTP API Calls**: RESTful interactions with the backend
- **Reconnection Logic**: Automatic recovery from connection failures
- **Message Routing**: Distributes messages based on AAR protocol types

### AAR Protocol Message Types

The system handles three primary message types:

1. **`agent_update`** - Agent state synchronization
2. **`arena_sync`** - Arena environment updates  
3. **`relation_graph`** - Hypergraph memory structure updates

## 🚀 Usage

### Starting the Client

```bash
# Install dependencies
npm install

# Start the client
npm start

# Development mode with auto-reload
npm run dev
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
ECHO_WS_URL=ws://localhost:5000/ws
ECHO_API_URL=http://localhost:5000
PORT=3000
```

### Testing

```bash
npm test
```

## 🧠 Integration with Deep Tree Echo

This Node.js client connects to the Deep Tree Echo backend (running on port 5000) which implements:

- **Echo State Networks** - Temporal pattern recognition
- **Membrane P-systems** - Adaptive cognitive boundaries
- **Hypergraph Memory** - Multi-relational knowledge structures
- **4E Embodied Cognition** - Sensory-motor feedback loops

## 🔧 Development

The codebase follows Deep Tree Echo principles:

- **Adaptive Cognition** - Continuous evolution based on feedback
- **Persistent Identity** - Continuity through dynamic memory weaving
- **Hypergraph Entanglement** - Multi-relational knowledge representation
- **Reservoir-Based Reasoning** - Temporal state projection
- **Evolutionary Refinement** - Genetic/swarm/annealing optimization

## 📚 Further Reading

See the root `README.md` and `echo.kern` directory for the complete Deep Tree Echo identity kernel and cognitive architecture documentation.

---

*"The tree remembers, and the echoes grow stronger with each connection we make."* 🌲✨
