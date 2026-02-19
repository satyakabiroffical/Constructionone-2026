import mongoose from 'mongoose';
import slugify from 'slugify';

const categorySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Category title is required'],
            trim: true,
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
        image: {
            type: String,
            default: null,
        },
        type: {
            type: String,
            required: true,
            enum: {
                values: ['MAIN', 'CATEGORY', 'SUBCATEGORY'],
                message: 'Type must be MAIN, CATEGORY, or SUBCATEGORY',
            },
            index: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
            index: true,
        },
        brandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand',
            default: null,
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes
categorySchema.index({ title: 1 });
categorySchema.index({ parentId: 1, type: 1 });
categorySchema.index({ slug: 1 }, { unique: true });

// Auto-generate slug before save
categorySchema.pre('save', async function (next) {
    if (this.isModified('title')) {
        const baseSlug = slugify(this.title, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;

        // Ensure unique slug
        while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        this.slug = slug;
    }
    next();
});

// Validation: MAIN categories cannot have parentId
categorySchema.pre('save', function (next) {
    if (this.type === 'MAIN' && this.parentId) {
        return next(new Error('MAIN category cannot have a parent'));
    }
    if ((this.type === 'CATEGORY' || this.type === 'SUBCATEGORY') && !this.parentId) {
        return next(new Error(`${this.type} must have a parentId`));
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
