import { type RedisClientOptions } from 'redis';

const isDevelopment = process.env.NODE_ENV === 'development';

interface RedisConfig {
  development: RedisClientOptions;
  production: RedisClientOptions;
}

const config: RedisConfig = {
  development: {
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '18684'),
      reconnectStrategy: () => 1000,
    },
  },
  production: {
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '18684'),
      connectTimeout: 10000,
      reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
    },
  },
};

export const redisConfig = isDevelopment
  ? config.development
  : config.production;
