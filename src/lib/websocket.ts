// WebSocket event types
export type WsEventType = 'question_reply' | 'PONG';

export interface WsMessage {
  type: WsEventType;
  data?: unknown;
  timestamp: number;
}

type EventHandler = (data: unknown) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: Map<WsEventType, Set<EventHandler>> = new Map();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isIntentionalClose = false;

  connect(token: string) {
    this.token = token;
    this.isIntentionalClose = false;
    this.disconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.pingTimer = setInterval(() => {
          this.send({ type: 'PING', timestamp: Date.now() });
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          const handlers = this.handlers.get(msg.type);
          if (handlers) {
            handlers.forEach(handler => handler(msg.data));
          }
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error', error);
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.clearPing();
        if (!this.isIntentionalClose && this.token) {
          this.reconnectTimer = setTimeout(() => {
            if (this.token) this.connect(this.token);
          }, 3000);
        }
      };
    } catch (e) {
      console.error('[WS] Failed to connect', e);
    }
  }

  disconnect() {
    this.isIntentionalClose = true;
    this.clearPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private send(msg: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private clearPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  on(type: WsEventType, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  off(type: WsEventType, handler: EventHandler) {
    this.handlers.get(type)?.delete(handler);
  }
}

export const wsService = new WebSocketService();
