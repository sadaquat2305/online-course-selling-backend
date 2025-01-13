import mongoose, { Schema } from "mongoose";

const courseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String },
    duration: { type: Number },
    thumbnail: { type: String }, // Cloudinary URL
    videos: [
      {
        videoId: { type: String, required: true },
        title: { type: String, required: true },
        duration: { type: Number, required: true },
        videoUrl: { type: String, required: true }, // Cloudinary URL
        isFreePreview: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Course = mongoose.model("Course", courseSchema);
