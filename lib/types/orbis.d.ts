declare module '@orbisclub/orbis-sdk' {
  export class Orbis {
    connect_v2(options: { provider: any; lit: boolean }): Promise<{
      status: number;
      did: string;
      details: {
        profile?: {
          username?: string;
          description?: string;
          pfp?: string;
        };
      };
    }>;

    logout(): Promise<void>;
  }
}
