import redis from"../config/redis.config.js";

const DEFAULT_TTL = 300; // 5 minutes

class RedisCache {
  static async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis GET error:", err);
      return null;
    }
  }

  static async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (err) {
      console.error("Redis SET error:", err);
    }
  }

  static async delete(pattern) {
    try {
      const keys = await redis.keys(`${pattern}*`);
      if (keys.length) await redis.del(keys);
    } catch (err) {
      console.error("Redis DELETE error:", err);
    }
  }
}

export default RedisCache;
