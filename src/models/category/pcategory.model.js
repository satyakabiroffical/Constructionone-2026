import mongoose from 'mongoose';
import slugify from 'slugify';

const pcategorySchema = new mongoose.Schema(
    {
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlatformModule',
            required: [true, 'Module ID is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Pcategory name is required'],
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
        order: {
            type: Number,
            default: 0,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Uniqueness: name unique per module
pcategorySchema.index({ moduleId: 1, name: 1 }, { unique: true });
// Performance: optimizes filtered list queries by moduleId + isActive + order
pcategorySchema.index({ moduleId: 1, isActive: 1, order: 1 });

pcategorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

export default mongoose.model('Pcategory', pcategorySchema);
