import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { Course } from "../models/course.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const registerCourse = asyncHandler( async ( req , res) => {

    // get course details from frontend
   // validation - not empty
   // check for thumbnail, check for thumbnail
   // upload them to cloudinary, thumbnail
   // create course object - create entry in db
   // check for course creation
   // return res


   const {title, description, category, price,duration } = req.body
   console.log("title: ", title);

   if (
       [title, description, category, price,duration ].some((field) => field?.trim() === "")
   ) {
       throw new ApiError(400, "All fields are required")
   }



   console.log(req.files);

   const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
   //const coverImageLocalPath = req.files?.coverImage[0]?.path;

 
   

   if (!thumbnailLocalPath) {
       throw new ApiError(400, "Thumbnail file is required")
   }

   const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
 

   if (!thumbnail) {
       throw new ApiError(400, "Thumbnail file is required")
   }
  

   const course = await Course.create({
        title,
        description,
        price,
        category,
        duration,
        thumbnail: thumbnail.url,

   })

   const createdCourse = await Course.findById(course._id).select()

   console.log('createdCourse', createdCourse)

   if (!createdCourse) {
       throw new ApiError(500, "Something went wrong while creating the course")
   }

   return res.status(200).json(
       new ApiResponse(200, createdCourse, " Course Create Successfully")
   )
})


const getAllCourses = asyncHandler( async (req, res) => {
    try {
        // Fetch all courses from the database
        const courses = await Course.find();

        // If no courses found
        if (!courses || courses.length === 0) {
            throw new ApiError(404, "No courses found");
        }

        // Return the courses in the response
        return res.status(200).json(
            new ApiResponse(200, courses, "Courses fetched successfully")
        );
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Error fetching courses");
    }
});

// Controller to add video to course
const addVideoToCourse = async (req, res) => {
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

const getAllVideos = asyncHandler(async (req, res) => {
  try {
    // Extract courseId from the request parameters
    const { courseId } = req.params;

    // Fetch the course from the database by courseId
    const course = await Course.findById(courseId);

    // If no course is found
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    // If no videos are associated with the course
    if (!course.videos || course.videos.length === 0) {
      throw new ApiError(404, "No videos found for this course");
    }

    // Return the videos in the response
    return res.status(200).json(
      new ApiResponse(200, course.videos, "Videos fetched successfully")
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Error fetching videos");
  }
});


const getAllCoursesByCategory = asyncHandler(async (req, res) => {
  try {
      // Fetch all courses grouped by category
      const courses = await Course.aggregate([
          { $group: { _id: "$category", courses: { $push: "$$ROOT" } } },
      ]);

      if (!courses || courses.length === 0) {
          throw new ApiError(404, "No courses found");
      }

      return res.status(200).json(
          new ApiResponse(200, courses, "Courses grouped by category fetched successfully")
      );
  } catch (error) {
      console.error(error);
      throw new ApiError(500, "Error fetching courses");
  }
});



export {
   registerCourse,
   getAllCourses,
   addVideoToCourse,
   getAllVideos,
   getAllCoursesByCategory
}