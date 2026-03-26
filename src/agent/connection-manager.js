/**
 * Deep Tree Echo Connection Manager
 * Handles WebSocket and HTTP connections for Agent-Arena-Relation (AAR)
 */

const WebSocket = require('ws');
const { fetch } = require('undici');
const { EventEmitter } = require('events');

class EchoConnectionManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.wsUrl = config.wsUrl || process.env.ECHO_WS_URL;
    this.apiUrl = config.apiUrl || process.env.ECHO_API_URL;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnects = 5;

    // AAR State
    this.agentState = {
      id: null,
      emotionalState: { valence: 0, arousal: 0, dominance: 0 },
      skillProficiencies: {},
      workingMemory: [],
      cognitiveStep: 0,
      lastUpdated: null,
    };

    this.arenaState = {
      id: null,
      participants: [],
      context: {},
      constraints: [],
      lastSynced: null,
    };

    this.relationGraph = {
      nodes: new Map(),
      edges: new Map(),
      lastUpdated: null,
    };

    // Message batching
    this._sendQueue = [];
    this._batchTimer = null;
    this._batchIntervalMs = config.batchIntervalMs || 50;

    // Heartbeat
    this._heartbeatTimer = null;
    this._heartbeatIntervalMs = config.heartbeatIntervalMs || 30000;
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log('🌲 Deep Tree Echo establishing quantum tunnel...');

      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        console.log('✨ Cognitive Tokamak connection established!');
        this.reconnectAttempts = 0;
        this._startHeartbeat();
        resolve(this.ws);
      });

      this.ws.on('error', (error) => {
        console.error('⚡ Connection perturbation detected:', error);
        this.handleReconnect();
      });

      this.ws.on('close', () => {
        console.log('🔄 Echo resonance interrupted, attempting reconnect...');
        this._stopHeartbeat();
        this.handleReconnect();
      });

      this.ws.on('message', (data) => {
        this.handleEchoMessage(data);
      });
    });
  }

  async makeAgentCallback(endpoint, data) {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Echo-Kernel': 'deep-tree-v1'
        },
        body: JSON.stringify(data)
      });

      return await response.json();
    } catch (error) {
      console.error('🔥 Agent callback failed:', error);
      throw error;
    }
  }

  handleEchoMessage(data) {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      console.error('Failed to parse echo message:', error);
      this.emit('error', { type: 'parse_error', error });
      return;
    }

    console.log('🎭 Echo received:', message.type);

    switch(message.type) {
      case 'agent_update':
        this.processAgentUpdate(message);
        break;
      case 'arena_sync':
        this.processArenaSync(message);
        break;
      case 'relation_graph':
        this.processRelationGraph(message);
        break;
      case 'heartbeat_ack':
        this.emit('heartbeat_ack', message);
        break;
      default:
        console.log('Unknown echo type:', message.type);
        this.emit('unknown_message', message);
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnects) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnects}`);
      setTimeout(() => this.connectWebSocket(), 2000 * this.reconnectAttempts);
    }
  }

  // ── AAR Message Handlers ──────────────────────────────────────────

  processAgentUpdate(message) {
    try {
      const data = message.data || {};

      if (data.id != null) {
        this.agentState.id = data.id;
      }
      if (data.emotionalState) {
        this.agentState.emotionalState = {
          ...this.agentState.emotionalState,
          ...data.emotionalState,
        };
      }
      if (data.skillProficiencies) {
        this.agentState.skillProficiencies = {
          ...this.agentState.skillProficiencies,
          ...data.skillProficiencies,
        };
      }
      if (data.workingMemory) {
        // Append new items, keep bounded to 128 entries
        const combined = [...this.agentState.workingMemory, ...data.workingMemory];
        this.agentState.workingMemory = combined.slice(-128);
      }
      if (data.cognitiveStep != null) {
        this.agentState.cognitiveStep = data.cognitiveStep;
      }

      this.agentState.lastUpdated = Date.now();
      this.emit('agent_update', this.agentState);
    } catch (error) {
      console.error('Error processing agent update:', error);
      this.emit('error', { type: 'agent_update_error', error, message });
    }
  }

  processArenaSync(message) {
    try {
      const data = message.data || {};

      if (data.id != null) {
        this.arenaState.id = data.id;
      }
      if (data.participants) {
        // Merge participants by id, add new ones, update existing
        const existing = new Map(this.arenaState.participants.map(p => [p.id, p]));
        for (const p of data.participants) {
          existing.set(p.id, { ...(existing.get(p.id) || {}), ...p });
        }
        this.arenaState.participants = Array.from(existing.values());
      }
      if (data.context) {
        this.arenaState.context = { ...this.arenaState.context, ...data.context };
      }
      if (data.constraints) {
        // Replace constraints on full sync, otherwise merge
        this.arenaState.constraints = data.fullSync
          ? data.constraints
          : [...new Set([...this.arenaState.constraints, ...data.constraints])];
      }

      this.arenaState.lastSynced = Date.now();
      this.emit('arena_sync', this.arenaState);
    } catch (error) {
      console.error('Error processing arena sync:', error);
      this.emit('error', { type: 'arena_sync_error', error, message });
    }
  }

  processRelationGraph(message) {
    try {
      const data = message.data || {};

      // Process node additions / updates
      if (data.nodes && Array.isArray(data.nodes)) {
        for (const node of data.nodes) {
          if (!node.id) continue;
          const existing = this.relationGraph.nodes.get(node.id) || {};
          this.relationGraph.nodes.set(node.id, { ...existing, ...node });
        }
      }

      // Process node removals
      if (data.removedNodes && Array.isArray(data.removedNodes)) {
        for (const nodeId of data.removedNodes) {
          this.relationGraph.nodes.delete(nodeId);
          // Clean up edges referencing removed nodes
          for (const [edgeId, edge] of this.relationGraph.edges) {
            if (edge.source === nodeId || edge.target === nodeId) {
              this.relationGraph.edges.delete(edgeId);
            }
          }
        }
      }

      // Process edge additions / updates
      if (data.edges && Array.isArray(data.edges)) {
        for (const edge of data.edges) {
          const edgeId = edge.id || `${edge.source}->${edge.target}`;
          const existing = this.relationGraph.edges.get(edgeId) || {};
          this.relationGraph.edges.set(edgeId, { ...existing, ...edge, id: edgeId });
        }
      }

      // Process edge removals
      if (data.removedEdges && Array.isArray(data.removedEdges)) {
        for (const edgeId of data.removedEdges) {
          this.relationGraph.edges.delete(edgeId);
        }
      }

      this.relationGraph.lastUpdated = Date.now();
      this.emit('relation_graph', {
        nodes: Array.from(this.relationGraph.nodes.values()),
        edges: Array.from(this.relationGraph.edges.values()),
      });
    } catch (error) {
      console.error('Error processing relation graph:', error);
      this.emit('error', { type: 'relation_graph_error', error, message });
    }
  }

  // ── WebSocket Send Methods ────────────────────────────────────────

  /**
   * Low-level batched send. Messages are queued and flushed on a timer.
   */
  _enqueue(payload) {
    this._sendQueue.push(payload);
    if (!this._batchTimer) {
      this._batchTimer = setTimeout(() => this._flushQueue(), this._batchIntervalMs);
    }
  }

  _flushQueue() {
    this._batchTimer = null;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not open, dropping', this._sendQueue.length, 'queued messages');
      this._sendQueue = [];
      return;
    }

    if (this._sendQueue.length === 0) return;

    // If only one message, send directly; otherwise batch
    const toSend = this._sendQueue.length === 1
      ? this._sendQueue[0]
      : { type: 'batch', messages: this._sendQueue };

    try {
      this.ws.send(JSON.stringify(toSend));
    } catch (error) {
      console.error('Failed to send batched messages:', error);
      this.emit('error', { type: 'send_error', error });
    }

    this._sendQueue = [];
  }

  /**
   * Force-flush any pending messages immediately.
   */
  flush() {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
    }
    this._flushQueue();
  }

  sendAgentUpdate(agentState) {
    const payload = {
      type: 'agent_update',
      timestamp: Date.now(),
      data: agentState,
    };
    this._enqueue(payload);
  }

  sendArenaSync(arenaState) {
    const payload = {
      type: 'arena_sync',
      timestamp: Date.now(),
      data: arenaState,
    };
    this._enqueue(payload);
  }

  sendRelationGraph(nodes, edges) {
    const payload = {
      type: 'relation_graph',
      timestamp: Date.now(),
      data: { nodes, edges },
    };
    this._enqueue(payload);
  }

  sendHeartbeat() {
    // Heartbeat bypasses the batch queue for reliability
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now(),
        agentId: this.agentState.id,
      }));
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this._heartbeatIntervalMs);
    // Don't let heartbeat timer keep the process alive
    if (this._heartbeatTimer.unref) {
      this._heartbeatTimer.unref();
    }
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // ── State Accessors ───────────────────────────────────────────────

  getAgentState() {
    return { ...this.agentState };
  }

  getArenaState() {
    return { ...this.arenaState };
  }

  getRelationGraphSnapshot() {
    return {
      nodes: Array.from(this.relationGraph.nodes.values()),
      edges: Array.from(this.relationGraph.edges.values()),
      lastUpdated: this.relationGraph.lastUpdated,
    };
  }

  /**
   * Gracefully close the connection.
   */
  disconnect() {
    this._stopHeartbeat();
    this.flush();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = EchoConnectionManager;
