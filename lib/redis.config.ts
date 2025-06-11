export const redisConfig = {
  development: {
    // Development-specific Redis configurations
    maxmemory: '10mb',
    maxmemory_policy: 'allkeys-lru',
    // More aggressive key expiration in development
    keyExpirationMultiplier: 0.5, // Expire keys twice as fast in development
    // Disable persistence in development
    save: '',
    appendonly: 'no',
  },
  production: {
    // Production-specific Redis configurations
    maxmemory: '30mb',
    maxmemory_policy: 'allkeys-lru',
    // Normal key expiration in production
    keyExpirationMultiplier: 1,
    // Enable AOF persistence in production
    appendonly: 'yes',
    appendfsync: 'everysec',
    // Disable RDB persistence in favor of AOF
    save: '',
  },
};
