export type MessageHandler = (message: string) => void;
export type OpenHandler = (event: Event) => void;
export type CloseHandler = (event: CloseEvent) => void;
export type ErrorHandler = (event: Event) => void;

export interface WebSocketClientOptions {
  url: string;
  protocols?: string | string[];
  onMessage?: MessageHandler;
  onOpen?: OpenHandler;
  onClose?: CloseHandler;
  onError?: ErrorHandler;
}

export class WebSocketClient {
  private socket: WebSocket;

  private url: string;

  private protocols?: string | string[];

  private onMessage?: MessageHandler;

  private onOpen?: OpenHandler;

  private onClose?: CloseHandler;

  private onError?: ErrorHandler;

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.protocols = options.protocols;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onError = options.onError;

    this.socket = new WebSocket(this.url, this.protocols);

    this.socket.addEventListener('open', (event) => {
      this.onOpen?.(event);
    });

    this.socket.addEventListener('message', (event) => {
      this.onMessage?.(event.data);
    });

    this.socket.addEventListener('close', (event) => {
      this.onClose?.(event);
    });

    this.socket.addEventListener('error', (event) => {
      this.onError?.(event);
    });
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.socket.send(data);
  }

  close(code?: number, reason?: string) {
    this.socket.close(code, reason);
  }

  get readyState() {
    return this.socket.readyState;
  }
}
