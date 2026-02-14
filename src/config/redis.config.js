import IORedis from 'ioredis'

const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
    keepAlive: 10000,
    password: "yourpassword"
});

redisConnection.on('connect', () => {
    console.log('Corezap Redis client connected');
});

redisConnection.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
        console.warn('⚠️  Redis connection failed: Redis server not valid (Is it running?). Caching will be skipped.');
    } else {
        console.error('Redis error:', err);
    }
});

export default redisConnection