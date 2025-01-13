import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { Course } from "../models/course.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Assuming you have this utility for Cloudinary upload
import { ApiResponse } from "../utils/ApiResponse.js";

// Controller to add video to course
export const addVideoToCourse = async (req, res) => {
  const { courseId } = req.params;
  const { title, duration, isFreePreview } = req.body;

  // Validate required fields
  if (!courseId || !title || !duration) {
    throw new ApiError(400, "courseId, title, and duration are required");
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Handle video upload
  const videoLocalPath = req.files?.video[0]?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary (Assuming `uploadOnCloudinary` is a helper function)
  const video = await uploadOnCloudinary(videoLocalPath);
  if (!video) {
    throw new ApiError(500, "Error uploading video to cloud storage");
  }

  // Create video object to add to course
  const newVideo = {
    videoId: new mongoose.Types.ObjectId().toString(),
    title,
    duration,
    videoUrl: video.url, // Cloudinary video URL
    isFreePreview: isFreePreview || false,
  };

  // Add video to the course
  course.videos.push(newVideo);
  await course.save();

  return res.status(200).json(
    new ApiResponse(200, newVideo, "Video added to course successfully")
  );
};
