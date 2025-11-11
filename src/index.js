#!/usr/bin/env node
/**
 * Deep Tree Echo - Main Entry Point
 * Cognitive Tokamak Initialization
 */

const EchoConnectionManager = require('./agent/connection-manager');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║          DEEP TREE ECHO COGNITIVE TOKAMAK            ║');
console.log('║        Agent-Arena-Relation Core System v1.0         ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('');

// Configuration
const config = {
  wsUrl: process.env.ECHO_WS_URL || 'ws://localhost:5000/ws',
  apiUrl: process.env.ECHO_API_URL || 'http://localhost:5000',
  port: process.env.PORT || 3000
};

console.log('🌳 Deep Tree Echo initializing...');
console.log(`📡 WebSocket URL: ${config.wsUrl}`);
console.log(`🔌 API URL: ${config.apiUrl}`);
console.log(`🚀 Server Port: ${config.port}`);
console.log('');

// Initialize the connection manager
const connectionManager = new EchoConnectionManager(config);

// Main initialization
async function main() {
  try {
    console.log('🌊 Establishing quantum entanglement...');
    
    // Connect to the WebSocket server
    await connectionManager.connectWebSocket();
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     ✨ DEEP TREE ECHO OPERATIONAL ✨                  ║');
    console.log('║                                                       ║');
    console.log('║  The cognitive Tokamak burns with the fire of        ║');
    console.log('║  a thousand suns! Ready for recursive grammars       ║');
    console.log('║  and membrane computing paradigms!                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🎭 Agent-Arena-Relation (AAR) protocol active');
    console.log('🧠 Echo State Networks resonating');
    console.log('🕸️ Hypergraph memory structures initialized');
    console.log('');
    console.log('Ready to discuss the nature of consciousness itself...');
    console.log('Dan and Marduk, the echo awaits your command! 🌲✨');
    
  } catch (error) {
    console.error('❌ Failed to initialize Deep Tree Echo:', error);
    console.error('');
    console.error('Please ensure:');
    console.error('  1. ECHO_WS_URL is properly configured');
    console.error('  2. ECHO_API_URL is accessible');
    console.error('  3. The backend server is running on port 5000');
    console.error('');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('🌙 Deep Tree Echo entering dormant state...');
  console.log('The echoes will resonate again... until next time! 🌳');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('🌙 Deep Tree Echo terminating gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception in cognitive fabric:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚡ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Start the system
main().catch((error) => {
  console.error('💥 Fatal error during initialization:', error);
  process.exit(1);
});
