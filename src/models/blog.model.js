import mongoose from "mongoose";
import { APIError } from "../middleware/errorHandler.js";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title must be at most 150 characters"],
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },

    content: {
      type: String,
      required: [true, "Blog content is required"],
      minlength: [20, "Content must be at least 20 characters"],
    },

    image: {
      type: String,
      trim: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },

    pcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: [30, "Each tag must be at most 30 characters"],
      },
    ],



    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },

    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],

    isActive: {
      type: Boolean,
      default: false,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


blogSchema.index({ title: "text", description: "text", content: "text" });
blogSchema.index({ pcategory: 1 });
blogSchema.index({ createdAt: -1 });


blogSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.title = this.title.trim();
  }
  if (this.isModified("slug")) {
    this.slug = this.slug.trim().toLowerCase();
  }
  next();
});



blogSchema.virtual("readingTime").get(function () {
  if (!this.content) return "0 min";
  const words = this.content.split(" ").length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
});


blogSchema.post("save", function (error, doc, next) {
  if (error?.code === 11000) {
    next(new APIError(400, "Blog slug must be unique", true));
  } else if (error?.name === "ValidationError") {
    const messages = Object.values(error.errors).map(e => e.message);
    next(new APIError(400, messages.join(". "), true));
  } else {
    next(error);
  }
});



const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
