/**
 * Deep Tree Echo - Connection Manager Tests
 */

const EchoConnectionManager = require('./connection-manager');

describe('EchoConnectionManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new EchoConnectionManager({
      wsUrl: 'ws://localhost:5000/ws',
      apiUrl: 'http://localhost:5000'
    });
  });

  test('should initialize with default config', () => {
    expect(manager.wsUrl).toBe('ws://localhost:5000/ws');
    expect(manager.apiUrl).toBe('http://localhost:5000');
    expect(manager.ws).toBeNull();
    expect(manager.reconnectAttempts).toBe(0);
    expect(manager.maxReconnects).toBe(5);
  });

  test('should use environment variables if config not provided', () => {
    process.env.ECHO_WS_URL = 'ws://test:8080/ws';
    process.env.ECHO_API_URL = 'http://test:8080';
    
    const envManager = new EchoConnectionManager();
    
    expect(envManager.wsUrl).toBe('ws://test:8080/ws');
    expect(envManager.apiUrl).toBe('http://test:8080');
    
    delete process.env.ECHO_WS_URL;
    delete process.env.ECHO_API_URL;
  });

  test('should have proper message handlers', () => {
    expect(typeof manager.processAgentUpdate).toBe('function');
    expect(typeof manager.processArenaSync).toBe('function');
    expect(typeof manager.processRelationGraph).toBe('function');
  });

  test('should handle echo messages with proper routing', () => {
    const agentUpdateSpy = jest.spyOn(manager, 'processAgentUpdate');
    const arenaSyncSpy = jest.spyOn(manager, 'processArenaSync');
    const relationGraphSpy = jest.spyOn(manager, 'processRelationGraph');

    // Test agent_update message
    manager.handleEchoMessage(Buffer.from(JSON.stringify({ type: 'agent_update', data: {} })));
    expect(agentUpdateSpy).toHaveBeenCalled();

    // Test arena_sync message
    manager.handleEchoMessage(Buffer.from(JSON.stringify({ type: 'arena_sync', data: {} })));
    expect(arenaSyncSpy).toHaveBeenCalled();

    // Test relation_graph message
    manager.handleEchoMessage(Buffer.from(JSON.stringify({ type: 'relation_graph', data: {} })));
    expect(relationGraphSpy).toHaveBeenCalled();
  });

  test('should have makeAgentCallback method', () => {
    expect(typeof manager.makeAgentCallback).toBe('function');
  });
});
