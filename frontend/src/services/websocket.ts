/**
 * WebSocket client for real-time flow execution.
 *
 * Connects to the backend at /ws/execution and handles:
 * - Sending flow execution requests
 * - Processing streaming events (node_start, node_output, node_complete, etc.)
 * - Updating the Zustand store with execution state
 */

import { useFlowStore } from '../store/flowStore';
import type { FlowDefinition, NodeStatus } from '../types/flow';
import { transformFlowForBackend } from './flowTransform';
import { toast } from '../components/ui/Toast';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws/execution';

type EventHandler = (event: WebSocketEvent) => void;

export interface WebSocketEvent {
  type: string;
  node_id?: string;
  flow_id?: string;
  data?: string;
  message?: string;
  timestamp?: string;
}

class FlowWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: EventHandler[] = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Connection error', err);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.ws = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          this.handleEvent(data);
          this.listeners.forEach((fn) => fn(data));
        } catch {
          console.error('[WS] Failed to parse message', event.data);
        }
      };
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  onEvent(handler: EventHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== handler);
    };
  }

  /**
   * Execute a flow by sending it over the WebSocket.
   * Returns a promise that resolves when the flow completes.
   */
  async executeFlow(flow: FlowDefinition, userInput: string): Promise<void> {
    const store = useFlowStore.getState();

    // Reset any previous execution state
    store.resetExecution();
    store.setIsRunning(true);

    try {
      await this.connect();
    } catch {
      store.setIsRunning(false);
      throw new Error('Could not connect to execution server');
    }

    return new Promise<void>((resolve, reject) => {
      const payload = {
        action: 'execute',
        flow: transformFlowForBackend(flow),
        user_input: userInput,
      };

      // Set up a one-time listener for completion
      const cleanup = this.onEvent((event) => {
        if (event.type === 'flow_complete') {
          store.setIsRunning(false);
          cleanup();
          resolve();
        }
        if (event.type === 'error') {
          // Both flow-level and node-level errors end execution
          store.setIsRunning(false);
          cleanup();
          reject(new Error(event.message ?? 'Flow execution failed'));
        }
      });

      this.ws!.send(JSON.stringify(payload));
    });
  }

  /** Map incoming WebSocket events to Zustand store updates */
  private handleEvent(event: WebSocketEvent) {
    const store = useFlowStore.getState();

    switch (event.type) {
      case 'node_start':
        if (event.node_id) {
          store.updateNodeStatus(event.node_id, 'running' as NodeStatus);
        }
        break;

      case 'node_output':
        if (event.node_id) {
          store.updateNodeStatus(event.node_id, 'running' as NodeStatus, event.data);
        }
        break;

      case 'node_complete':
        if (event.node_id) {
          store.updateNodeStatus(event.node_id, 'completed' as NodeStatus);
        }
        break;

      case 'node_skipped':
        if (event.node_id) {
          store.updateNodeStatus(event.node_id, 'completed' as NodeStatus);
        }
        break;

      case 'error':
        if (event.node_id) {
          store.updateNodeStatus(
            event.node_id,
            'error' as NodeStatus,
            undefined,
            event.message,
          );
          toast.error('Node error', event.message ?? 'A node failed during execution');
        }
        store.setIsRunning(false);
        break;

      case 'flow_complete':
        store.setIsRunning(false);
        break;
    }
  }
}

/** Singleton WebSocket instance */
export const flowWebSocket = new FlowWebSocket();
