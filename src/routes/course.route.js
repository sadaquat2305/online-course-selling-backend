import { Router } from "express";
import { registerCourse, getAllCourses, addVideoToCourse , getAllVideos , getAllCoursesByCategory } from "../controllers/course.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Route to register a course with a thumbnail
router.route("/register").post(
  upload.fields([
    {
      name: "thumbnail", // The field name for thumbnail
      maxCount: 1, // Max 1 file allowed
    },
  ]),
  registerCourse // Handle course registration, including saving the thumbnail URL
);

// Route to get all courses
router.get('/courses', getAllCourses);

router.get('/course-category' ,getAllCoursesByCategory)


// Route to add video to a specific course
router.post("/:courseId/videos", upload.fields([
  {
    name: "video", // Field name for video
    maxCount: 1,   // Max 1 video file allowed
  },
]), addVideoToCourse); // This will handle adding the video to the course


router.get("/:courseId/videos", getAllVideos);

export default router;
