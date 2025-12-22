// src/controllers/example.controller.js
import Example from '../models/example.model.js';
import { APIError } from '../middleware/errorHandler.js';

// Cache configuration
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getExamples = async (req, res, next) => {
  try {
    const cacheKey = `examples_${JSON.stringify(req.query)}`;
    
    // Check cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    // Build query
    const query = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(el => delete query[el]);

    // Execute query
    const examples = await Example.find(query)
      .sort(req.query.sort || '-createdAt')
      .limit(parseInt(req.query.limit) || 10);

    // Cache the result
    const result = {
      status: 'success',
      message: 'Examples retrieved successfully',
      results: examples.length,
      data: { examples }
    };
    
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getExample = async (req, res, next) => {
  try {
    const example = await Example.findById(req.params.id);
    
    if (!example) {
      throw new APIError(404, 'No example found with that ID');
    }

    res.json({
      status: 'success',
      message: 'Example retrieved successfully',
      data: { example }
    });
  } catch (error) {
    next(error);
  }
};

export const createExample = async (req, res, next) => {
  try {
    const example = await Example.create(req.body);
    
    // Invalidate cache
    invalidateCache('examples');
    
    res.status(201).json({
      status: 'success',
      message: 'Example created successfully',
      data: { example }
    });
  } catch (error) {
    next(error);
  }
};

export const updateExample = async (req, res, next) => {
  try {
    const example = await Example.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!example) {
      throw new APIError(404, 'No example found with that ID');
    }

    // Invalidate cache
    invalidateCache('examples');
    cache.delete(`example_${req.params.id}`);

    res.json({
      status: 'success',
      message: 'Example updated successfully',
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
      throw new APIError(404, 'No example found with that ID');
    }

    // Invalidate cache
    invalidateCache('examples');
    cache.delete(`example_${req.params.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Example deleted successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to invalidate cache
function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}