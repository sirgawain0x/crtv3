/** Minimal Google Cast Framework types for the Web Sender (default media receiver). */

export const DEFAULT_MEDIA_RECEIVER_APP_ID = "CC1AD845";

export interface CastMediaInfo {
  contentId: string;
  contentType: string;
  streamType: "BUFFERED" | "LIVE" | "NONE";
  metadata?: {
    title?: string;
    subtitle?: string;
    images?: Array<{ url: string }>;
  };
}

export interface CastSessionLike {
  loadMedia(request: { media: CastMediaInfo; autoplay?: boolean }): Promise<void>;
}

export interface CastContextLike {
  setOptions(options: {
    receiverApplicationId: string;
    autoJoinPolicy: number;
  }): void;
  getCurrentSession(): CastSessionLike | null;
  requestSession(): Promise<CastSessionLike>;
  addEventListener(
    type: string,
    handler: (event: { sessionState: string }) => void,
  ): void;
  removeEventListener(
    type: string,
    handler: (event: { sessionState: string }) => void,
  ): void;
  getCastState(): string;
}

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: {
      framework: {
        CastContext: {
          getInstance(): CastContextLike;
        };
        CastState: {
          NO_DEVICES_AVAILABLE: string;
          NOT_CONNECTED: string;
          CONNECTING: string;
          CONNECTED: string;
        };
        SessionState: {
          SESSION_STARTED: string;
          SESSION_ENDED: string;
        };
      };
    };
    chrome?: {
      cast?: {
        AutoJoinPolicy: {
          ORIGIN_SCOPED: number;
        };
        media: {
          StreamType: {
            BUFFERED: "BUFFERED";
            LIVE: "LIVE";
          };
        };
      };
    };
  }
}

export {};
