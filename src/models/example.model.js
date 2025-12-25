import mongoose from "mongoose";
import validator from "validator";
import { APIError } from "../middleware/errorHandler.js";

const exampleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "pending"],
        message: "Status must be either active, inactive, or pending",
      },
      default: "active",
    },
    priority: {
      type: Number,
      min: [1, "Priority must be at least 1"],
      max: [5, "Priority must be at most 5"],
      default: 3,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [20, "Each tag must be at most 20 characters"],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
exampleSchema.index({ name: "text", description: "text" });
exampleSchema.index({ status: 1, priority: -1 });

// Document middleware: runs before .save() and .create()
exampleSchema.pre("save", function (next) {
  // Example of document middleware
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }
  next();
});

// Query middleware
exampleSchema.pre(/^find/, function (next) {
  // Automatically filter out inactive documents unless explicitly requested
  if (this.getFilter().status === undefined) {
    this.find({ status: { $ne: "inactive" } });
  }
  next();
});

// Static method example
// Example: const stats = await Example.calculateStats();
exampleSchema.statics.calculateStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgPriority: { $avg: "$priority" },
      },
    },
  ]);

  return stats;
};

// Instance method example
// Example: await example.getSimilarExamples();
exampleSchema.methods.getSimilarExamples = function () {
  return this.constructor.find({
    _id: { $ne: this._id },
    status: this.status,
    priority: { $gte: this.priority - 1, $lte: this.priority + 1 },
  });
};

// Virtual property (not stored in DB)
exampleSchema.virtual("priorityLabel").get(function () {
  const priorityMap = {
    1: "Low",
    2: "Medium-Low",
    3: "Medium",
    4: "High-Medium",
    5: "High",
  };
  return priorityMap[this.priority] || "Unknown";
});

// Error handling middleware
exampleSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(new APIError(400, "Name must be unique", true));
  } else if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((el) => el.message);
    next(new APIError(400, `${errors.join(". ")}`, true));
  } else {
    next(error);
  }
});

const Example = mongoose.model("Example", exampleSchema);

export default Example;
