// src/controllers/example.controller.js
import Example from '../models/example.model.js';
import { APIError } from '../middleware/errorHandler.js';
import redis from '../config/redis.config.js';

// Cache 
export const getExamples = async (req, res, next) => {
  try {
    const cacheKey = `examples:${JSON.stringify(req.query)}`;

    // 1️⃣ Check Redis
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // 2️⃣ Build Query
    const query = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(el => delete query[el]);

    const examples = await Example.find(query)
      .sort(req.query.sort || '-createdAt')
      .limit(parseInt(req.query.limit) || 10);

    const result = {
      status: 'success',
      message: 'Examples retrieved successfully',
      results: examples.length,
      data: { examples }
    };

    // 3️⃣ Save to Redis (5 min expiry)
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

    res.json(result);

  } catch (error) {
    next(error);
  }
};
