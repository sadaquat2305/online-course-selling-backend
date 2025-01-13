// import mongoose, { Schema } from "mongoose";

// const videoSchema = new Schema(
//   {
//     videoId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     courseId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Course", // References the Course collection
//       required: true,
//     },
//     title: {
//       type: String,
//       required: true,
//     },
//     duration: {
//       type: Number, // Duration in seconds or minutes
//       required: true,
//     },
//     videoUrl: {
//       type: String, // Cloudinary URL or any other video hosting URL
//       required: true,
//     },
//     isFreePreview: {
//       type: Boolean,
//       default: false, // Default to false, indicating it's not a free preview
//     },
//   },
//   {
//     timestamps: true, // Automatically manage createdAt and updatedAt fields
//   }
// );

// export const Video = mongoose.model("Video", videoSchema);
