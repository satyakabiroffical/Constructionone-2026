import HomeSection from '../models/home/homeSection.model.js';
import PlatformModule from '../models/platform/module.model.js';
import { sectionResolvers } from '../resolvers/sectionResolvers.js';
import { APIError } from '../middlewares/errorHandler.js';
import RedisCache from '../utils/redisCache.js';

const HOME_TTL = 300; // 5 minutes

// ─── Cache key helpers ────────────────────────────────────────────────────────
export const homeCacheKey = (slug) => `home:${slug}`;
export const invalidateHome = async (moduleId) => {
    // Find the slug for the moduleId and delete its cache
    const mod = await PlatformModule.findById(moduleId).select('slug').lean();
    if (mod?.slug) await RedisCache.delete(homeCacheKey(mod.slug));
};

// ─── Public: build full home for a module ─────────────────────────────────────
export const buildHome = async (moduleSlug) => {
    // 1. Resolve module
    const module = await PlatformModule.findOne({ slug: moduleSlug, isActive: true })
        .select('_id title slug')
        .lean();
    if (!module) throw new APIError(404, `Module "${moduleSlug}" not found`);

    // 2. Fetch active section configs — sorted by order
    const sections = await HomeSection.find({
        moduleId: module._id,
        isActive: true,
    })
        .sort({ order: 1 })
        .lean();

    if (!sections.length) return { module, sections: [] };

    // 3. Resolve all sections in PARALLEL (no sequential N+1)
    const resolvedData = await Promise.all(
        sections.map((section) => {
            const resolver = sectionResolvers[section.type];
            if (!resolver) return Promise.resolve([]);  // unregistered type → empty
            return resolver(section).catch(() => []);    // never let one failure break home
        })
    );

    // 4. Assemble final response
    const result = sections.map((section, i) => ({
        key: section.key,
        type: section.type,
        title: section.title,
        order: section.order,
        data: resolvedData[i],
    }));

    return { module, sections: result };
};

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
export const createSection = async (data, userId) => {
    const section = await HomeSection.create({ ...data, createdBy: userId });
    await invalidateHome(data.moduleId);
    return section;
};

export const getAllSections = async (query) => {
    const { moduleId, isActive, page = 1, limit = 20 } = query;
    const filter = {};
    if (moduleId) filter.moduleId = moduleId;
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sections, total] = await Promise.all([
        HomeSection.find(filter).sort({ order: 1 }).skip(skip).limit(parseInt(limit)).lean(),
        HomeSection.countDocuments(filter),
    ]);
    return { sections, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) };
};

export const getSectionById = async (id) => {
    const section = await HomeSection.findById(id).lean();
    if (!section) throw new APIError(404, 'HomeSection not found');
    return section;
};

export const updateSection = async (id, data) => {
    const section = await HomeSection.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!section) throw new APIError(404, 'HomeSection not found');
    await invalidateHome(section.moduleId);
    return section;
};

export const removeSection = async (id) => {
    const section = await HomeSection.findByIdAndDelete(id).lean();
    if (!section) throw new APIError(404, 'HomeSection not found');
    await invalidateHome(section.moduleId);
    return section;
};

export const toggleSection = async (id) => {
    const section = await HomeSection.findById(id);
    if (!section) throw new APIError(404, 'HomeSection not found');
    section.isActive = !section.isActive;
    await section.save({ validateBeforeSave: false });
    await invalidateHome(section.moduleId);
    return section;
};
