import mongoose from 'mongoose';
import slugify from 'slugify';

const moduleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
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
            required: [true, 'Image URL is required'],
        },
        // Optional field for public controller requirements
        icon: {
            type: String,
        },
        type: {
            type: String,
            uppercase: true, // e.g., "SERVICE", "MATERIAL"
            trim: true,
            index: true,
        },
        routePath: {
            type: String,
            required: [true, 'Route path is required'],
            trim: true,
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
        isVisible: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate slug
moduleSchema.pre('save', function (next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }
    next();
});

export default mongoose.model('PlatformModule', moduleSchema);
