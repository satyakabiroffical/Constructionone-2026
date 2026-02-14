// src/controllers/example.controller.js
import Example from '../models/example.model.js';
import { APIError } from '../middleware/errorHandler.js';
import redis from '../config/redis.config.js';

// Cache 
export const getExamples = async (req, res, next) => {
  try {
    const cacheKey = `examples:${JSON.stringify(req.query)}`;

    // Check Redis
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Build Query
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

    // Save to Redis (5 min expiry)
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

export const createExample = async (req, res, next) => {
  try {
    const example = await Example.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { example }
    });
  } catch (error) {
    next(error);
  }
};

export const getExample = async (req, res, next) => {
  try {
    const example = await Example.findById(req.params.id);
    if (!example) {
      return next(new APIError('No example found with that ID', 404));
    }
    res.json({
      status: 'success',
      data: { example }
    });
  } catch (error) {
    next(error);
  }
};

export const updateExample = async (req, res, next) => {
  try {
    const example = await Example.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!example) {
      return next(new APIError('No example found with that ID', 404));
    }
    res.json({
      status: 'success',
      data: { example }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExample = async (req, res, next) => {
  try {
    const example = await Example.findByIdAndDelete(req.params.id);
    if (!example) {
      return next(new APIError('No example found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
