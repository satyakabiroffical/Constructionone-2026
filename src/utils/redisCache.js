import redis from "../config/redis.config.js";

const DEFAULT_TTL = 300; // 5 minutes

class RedisCache {
  // ---------- GET ----------
  static async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis GET error:", err);
      return null;
    }
  }

  // ---------- SET ----------
  static async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await redis.set(key, JSON.stringify(value), {
        EX: ttl,
      });
    } catch (err) {
      console.error("Redis SET error:", err);
    }
  }

  // ---------- DELETE SINGLE ----------
  static async delete(key) {
    try {
      await redis.del(key);
    } catch (err) {
      console.error("Redis DELETE error:", err);
    }
  }

  // ---------- SAFE PATTERN DELETE (PRODUCTION) ----------
  static async deletePattern(pattern) {
    try {
      let cursor = "0";

      do {
        const reply = await redis.scan(cursor, {
          MATCH: `${pattern}*`,
          COUNT: 100,
        });

        cursor = reply.cursor;
        const keys = reply.keys;

        if (keys.length) {
          await redis.del(keys);
        }
      } while (cursor !== "0");
    } catch (err) {
      console.error("Redis DELETE PATTERN error:", err);
    }
  }
}

export default RedisCache;