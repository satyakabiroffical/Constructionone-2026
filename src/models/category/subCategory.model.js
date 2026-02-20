import mongoose from 'mongoose';
import slugify from 'slugify';

const subCategorySchema = new mongoose.Schema(
    {
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlatformModule',
            required: [true, 'Module ID is required'],
        },
        pcategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Pcategory',
            required: [true, 'Parent Category ID is required'],
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category ID is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'SubCategory name is required'],
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
            default: '',
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
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure name uniqueness per category
subCategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });

subCategorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

export default mongoose.model('SubCategory', subCategorySchema);
