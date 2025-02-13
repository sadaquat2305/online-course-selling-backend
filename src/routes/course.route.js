import { Router } from "express";
import { createCourse,
   getAllCourses, 
   addVideoToCourse , 
   getAllVideos , 
   getCoursesForStudents,
   getAllCoursesByCategory , 
   addLesson, 
   getAllCoursesFromUserId, 
   lessonUpdateByLessonId,
   createLesson , 
   getAllLessonsFromCourseId,
   deleteLessonByLessonId,
   toggleLessonLock} from "../controllers/course.controller.js";
   
import { upload } from "../middlewares/multer.middleware.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Route to register a course with a thumbnail
router.route("/register").post(
  upload.fields([
    {
      name: "thumbnail", // The field name for thumbnail
      maxCount: 1, // Max 1 file allowed
    },
  ]),
  createCourse // Handle course registration, including saving the thumbnail URL
);

router.route("/create-course").post(verifyJWT, upload.single("thumbnail"), createCourse)

router.route("/create-lesson").post(verifyJWT, upload.fields([

  {
    name: "thumbnail", // The field name for thumbnail
    maxCount: 1, // Max 1 file allowed
  },

  {
    name: "video", // The field name for thumbnail
    maxCount: 1, // Max 1 file allowed
  },

]), createLesson)

//router.route("all-courses").get(verifyJWT, getAllCoursesFromUserId );

router.get("/all-coursess" , verifyJWT , getAllCoursesFromUserId )

router.get("/all-lesson/:courseId", verifyJWT, getAllLessonsFromCourseId);

// Route to get all courses
router.get('/courses', getAllCourses);

router.get('/course-category' ,getAllCoursesByCategory)

router.get("/student-courses", verifyJWT , getCoursesForStudents); // Define route correctly

router.patch("/:lessonId/toggle-lock", verifyJWT, toggleLessonLock);

router.route("/:lessonId").patch(verifyJWT, upload.single("thumbnail"), lessonUpdateByLessonId)

router.delete("/:lessonId",verifyJWT , deleteLessonByLessonId);


// Route to add video to a specific course
router.post("/:courseId/videos", upload.fields([
  {
    name: "video", // Field name for video
    maxCount: 1,   // Max 1 video file allowed
  },
]), addVideoToCourse); // This will handle adding the video to the course


router.get("/:courseId/videos", getAllVideos);

export default router;
