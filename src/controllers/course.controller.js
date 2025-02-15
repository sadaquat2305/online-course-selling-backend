import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"

import { Course } from "../models/course.model.js"

import crypto from "crypto";

import { Payment } from "../models/payment.model.js";

import Razorpay from "razorpay";

import { Lesson } from "../models/lesson.model.js"

import {uploadOnS3} from "../utils/cloudinary.js"
import { deleteFromS3 } from "../utils/deleteFromS3.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import mongoose from "mongoose";

// AWS S3 Client Setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createCourse = asyncHandler(async (req, res) => {

  const { title, description, price , category } = req.body;

  console.log("Request Body:", req.body);

  // const avatarLocalPath = req.file?.path;

  // console.log(`Profile Photo ${avatarLocalPath}`);

  if (!title) {
      throw new ApiError(400, "Title  is required");
  }
  if (!description) {
      throw new ApiError(400, "Description is required");
  }
  if (!price) {
      throw new ApiError(400, "Price is required");
  }

  if (!category) {
      throw new ApiError(400, "Password is required");
  }

  // if(req.user.role != "teacher"){
  //   throw new ApiError(400 , "Only teacher can Create Course")
  // }

  const thumbnailLocalPath = req.file?.path

  if(!thumbnailLocalPath){

      throw new ApiError(400 , "Thumbnail is missing ")
  }

  const fileKey = `courses/${Date.now()}_${req.file.originalname}`;

  const result = await uploadOnS3(req.file.path , fileKey)

  if(!result){

     throw new ApiError(500 , "Result is not found from S3")

  }

  const course = await Course.create({ 
    instructorId: req.user._id,  // ✅ Use req.user._id
    title, 
    description, 
    price, 
    category, 
    thumbnailUrl: result.fileKey 
  });
  

  //, profilePicUrl : result.fileKey 

  if (!course) {
      throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(200).json(
      new ApiResponse(200, course, "Course Created successfully")
  );
});


const createLesson = asyncHandler(async (req, res) => {
  const { courseId, title, content, isFree, order } = req.body;

  // Log request body for debugging
  console.log("Request Body:", req.body);

  // Validation
  if (!title) {
    throw new ApiError(400, "Title is required");
  }
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  if (isFree === undefined) {
    throw new ApiError(400, "isFree is required");
  }
  if (order === undefined) {
    throw new ApiError(400, "Order is required");
  }

  // // Check if user is a teacher
  // if (req.user.role !== "teacher") {
  //   throw new ApiError(403, "Only teacher can create a lesson");
  // }

  // Log files object to ensure they are being uploaded correctly
  console.log("Files:", req.files);  // Logs the entire files object
  console.log("Video File:", req.files.video);
  console.log("Thumbnail File:", req.files.thumbnail);

  // Ensure both video and thumbnail files are present
  if (!req.files || !req.files.video || !req.files.thumbnail) {
    throw new ApiError(400, "Both video and thumbnail files are required");
  }

  // Handle video file upload (S3)
  const videoLocalPath = req.files.video[0]?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video is missing");
  }

  const videoFileKey = `videos/${Date.now()}_${req.files.video[0].originalname}`;

  // Upload the video to S3
  const result = await uploadOnS3(videoLocalPath, videoFileKey, "video/mp4");
  if (!result) {
    throw new ApiError(500, "Failed to upload video to S3");
  }

  // Handle thumbnail file upload (S3)
  const thumbnailLocalPath = req.files.thumbnail[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is missing");
  }

  const thumbnailFileKey = `thumbnails/${Date.now()}_${req.files.thumbnail[0].originalname}`;

  // Upload the thumbnail to S3
  const thumbnailResult = await uploadOnS3(thumbnailLocalPath, thumbnailFileKey, "image/jpeg");
  if (!thumbnailResult) {
    throw new ApiError(500, "Failed to upload thumbnail to S3");
  }

  // Create lesson in the database
  const lesson = await Lesson.create({
    courseId,
    title,
    content,
    videoUrl: result.fileKey,  // Store the fileKey returned by the S3 upload
    thumbnailUrl: thumbnailResult.fileKey,  // Store the thumbnail fileKey
    isFree,
    order,
  });

  // Check if lesson creation was successful
  if (!lesson) {
    throw new ApiError(500, "Failed to create lesson");
  }

  // Return success response
  return res.status(200).json(
    new ApiResponse(200, lesson, "Lesson created successfully")
  );
});

const lessonUpdateByLessonId = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { title, content, order } = req.body;
  const thumbnail = req.file; // ✅ Use `req.file` for single file upload

  console.log("📥 Received Data:", req.body);
  console.log("📷 Received File:", req.file); // ✅ Log to debug

  if (!lessonId) {
    return res.status(400).json({ success: false, message: "Lesson ID is required" });
  }

  let lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }

  try {
    let updatedThumbnailUrl = lesson.thumbnailUrl;

    // ✅ If a new thumbnail is uploaded, delete the old one and upload a new one
    if (thumbnail) {
      const thumbnailPath = thumbnail.path;
      console.log("🗑️ Deleting old Thumbnail:", lesson.thumbnailUrl);
      if (lesson.thumbnailUrl) {
        await deleteFromS3(lesson.thumbnailUrl); // ✅ Ensure the old file is removed
      }

      // ✅ Upload new thumbnail to S3
      const thumbnailFileKey = `thumbnails/${Date.now()}_${thumbnail.filename}`;
      const uploadResult = await uploadOnS3(thumbnailPath, thumbnailFileKey, "image/jpeg");
      updatedThumbnailUrl = uploadResult.fileKey;
    } else {
      console.log("🚨 No new thumbnail uploaded. Keeping the old one.");
    }

    // 📝 Update lesson details in MongoDB
    lesson.title = title || lesson.title;
    lesson.content = content || lesson.content;
    lesson.order = order !== undefined ? order : lesson.order;
    lesson.thumbnailUrl = updatedThumbnailUrl; // ✅ Update only the thumbnail

    await lesson.save();
    console.log("✅ Lesson updated successfully:", lesson);

    // ✅ Generate a signed URL for the new thumbnail
    let thumbnailSignedUrl = null;
    if (updatedThumbnailUrl) {
      const thumbnailCommand = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: updatedThumbnailUrl,
        ResponseContentType: "image/jpeg",
      });

      try {
        thumbnailSignedUrl = await getSignedUrl(s3, thumbnailCommand, { expiresIn: 3600 }); // 1-hour expiry
      } catch (err) {
        console.error("Error generating thumbnail signed URL:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      lesson: {
        ...lesson.toObject(),
        thumbnailSignedUrl, // ✅ Include signed URL for immediate access
      },
    });
  } catch (error) {
    console.error("❌ Lesson Update Failed:", error);
    res.status(500).json({ success: false, message: "Failed to update lesson" });
  }
});





const deleteLessonByLessonId = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  if (!lessonId) {
    return res.status(400).json({ success: false, message: "Lesson ID is required" });
  }

  // 🔍 Find the lesson in the database
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }

  // 🔥 Delete lesson's video & thumbnail from S3
  try {
    if (lesson.thumbnailUrl) {
      console.log("Deleting Thumbnail:", lesson.thumbnailUrl);
      await deleteFromS3(lesson.thumbnailUrl);
    }
    if (lesson.videoUrl) {
      console.log("Deleting Video:", lesson.videoUrl);
      await deleteFromS3(lesson.videoUrl);
    }
  } catch (error) {
    console.error("S3 Deletion Failed:", error);
    return res.status(500).json({ success: false, message: "Failed to delete files from S3" });
  }

  // 🗑️ Delete lesson from MongoDB
  await Lesson.findByIdAndDelete(lessonId);

  res.status(200).json({ success: true, message: "Lesson deleted successfully" });
});


const toggleLessonLock = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  // // Check if user is a teacher (Ensure this middleware is applied before calling the controller)
  // if (!req.user || req.user.role !== "teacher") {
  //   throw new ApiError(403, "Access denied: Only teachers can change lesson lock status");
  // }

  if (!lessonId) {
    throw new ApiError(400, "Lesson ID is required");
  }

  // Find the lesson by ID
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  }

  // Toggle the isFree property
  lesson.isFree = !lesson.isFree;
  await lesson.save();

  return res.status(200).json(new ApiResponse(200, lesson, `Lesson is now ${lesson.isFree ? "free" : "locked"}`));
});




const getAllCoursesFromUserId = asyncHandler(async (req, res) => {
  try {
    const instructorId = req.user._id; // ✅ Get instructor ID from the logged-in user

    // if (req.user.role !== "teacher") {
    //   throw new ApiError(403, "Only instructors can view their courses");
    // }

    // Fetch all courses for the instructor
    const courses = await Course.find({ instructorId });

    if (!courses || courses.length === 0) {
      return res.status(404).json(new ApiResponse(404, [], "No courses found for this instructor"));
    }

    // Map through courses to include Signed URL for thumbnail
    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course) => {
        let signedUrl = null;

        if (course.thumbnailUrl) {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: course.thumbnailUrl,
            ResponseContentType: "image/jpeg"
          });

          signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour
        }

        return {
          ...course.toObject(),
          thumbnailSignedUrl: signedUrl, // Include Signed URL
        };
      })
    );

    return res.status(200).json(new ApiResponse(200, coursesWithThumbnails, "Courses fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something went wrong while fetching courses");
  }
});

const getCoursesForStudents = asyncHandler(async (req, res) => {
  try {
    // Get studentId directly from req.user (which is set by the verifyJWT middleware)
    const studentId = req.user._id;

    const allowedCategories = ["BAMS FIRST PROF", "BAMS SECOND PROF", "BAMS THIRD PROF"];

    // Fetch student details
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json(new ApiResponse(404, [], "Student not found"));
    }

    // Clean up expired courses from the student's purchasedCourses array
    const now = new Date();
    student.purchasedCourses = student.purchasedCourses.filter(
      (purchase) => new Date(purchase.expiryDate) > now
    );

    // Save the updated student document (only if changes were made)
    if (student.isModified("purchasedCourses")) {
      await student.save();
    }

    // Fetch all courses in the allowed categories
    const courses = await Course.find(
      { category: { $in: allowedCategories } },
      { title: 1, description: 1, thumbnailUrl: 1, isPublished: 1, createdAt: 1, updatedAt: 1, category: 1, _id: 1, price: 1 }
    );

    if (!courses || courses.length === 0) {
      return res.status(404).json(new ApiResponse(404, [], "No courses found"));
    }

    const coursesWithLessons = await Promise.all(
      courses.map(async (course) => {
        // Check if the student has purchased this course and its access is not expired
        const purchase = student.purchasedCourses.find(
          (p) => p.courseId.toString() === course._id.toString()
        );

        const isPurchased = !!purchase;

        // Fetch lessons: all if purchased, or all lessons if not purchased (no filtering by isFree)
        const lessons = await Lesson.find(
          { courseId: course._id },  // Fetch all lessons regardless of isFree
          { title: 1, content: 1, isFree: 1, order: 1, videoUrl: 1, thumbnailUrl: 1, _id: 1 }
        ).sort({ order: 1 });

        // Generate Signed URL for Course Thumbnail
        let courseSignedUrl = null;
        if (course.thumbnailUrl) {
          try {
            courseSignedUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: course.thumbnailUrl, ResponseContentType: "image/jpeg" }),
              { expiresIn: 3600 }
            );
          } catch (err) {
            console.error("Error generating course signed URL:", err);
          }
        }

        // Process lessons and generate signed URLs for videos and thumbnails
        const lessonsWithSignedUrls = await Promise.all(
          lessons.map(async (lesson) => {
            let videoSignedUrl = null;
            let thumbnailSignedUrl = null;

            // Generate signed URL for video only if accessible (either free or purchased)
            if ((lesson.isFree || isPurchased) && lesson.videoUrl) {
              try {
                videoSignedUrl = await getSignedUrl(
                  s3,
                  new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: lesson.videoUrl, ResponseContentType: "video/mp4" }),
                  { expiresIn: 3600 }
                );
              } catch (err) {
                console.error("Error generating video signed URL:", err);
              }
            }

            // Generate signed URL for lesson thumbnail
            if (lesson.thumbnailUrl) {
              try {
                thumbnailSignedUrl = await getSignedUrl(
                  s3,
                  new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: lesson.thumbnailUrl, ResponseContentType: "image/jpeg" }),
                  { expiresIn: 3600 }
                );
              } catch (err) {
                console.error("Error generating lesson thumbnail signed URL:", err);
              }
            }

            return {
              _id: lesson._id,
              title: lesson.title,
              content: lesson.content,
              isFree: lesson.isFree,
              order: lesson.order,
              videoSignedUrl, // Will be null if not accessible
              thumbnailSignedUrl,
            };
          })
        );

        return {
          _id: course._id,
          title: course.title,
          description: course.description,
          courseSignedUrl,
          isPublished: course.isPublished,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          category: course.category,
          lessons: lessonsWithSignedUrls,
          price: course.price,
          isPurchased, // Indicates if the student has purchased this course
        };
      })
    );

    // Group courses by category
    const groupedCourses = allowedCategories.map((category) => ({
      category,
      courses: coursesWithLessons.filter((course) => course.category === category),
    }));

    return res.status(200).json(new ApiResponse(200, groupedCourses, "Courses grouped by category fetched successfully"));
  } catch (error) {
    console.error("Error in getCoursesForStudents:", error);
    throw new ApiError(500, error.message || "Something went wrong while fetching courses");
  }
});



const getAllLessonsFromCourseId = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params; // Get courseId from request params

    if (!courseId) {
      throw new ApiError(400, "Course ID is required");
    }

    // Fetch all lessons for the course and sort by 'order' field in ascending order
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

    if (!lessons || lessons.length === 0) {
      return res.status(404).json(new ApiResponse(404, [], "No lessons found for this course"));
    }

    // Map through lessons to include Signed URL for video and thumbnail
    const lessonsWithSignedUrls = await Promise.all(
      lessons.map(async (lesson) => {
        let videoSignedUrl = null;
        let thumbnailSignedUrl = null;

        // If lesson has a video URL, generate a signed URL for the video
        if (lesson.videoUrl) {
          const videoCommand = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: lesson.videoUrl,
            ResponseContentType: "video/mp4", // Adjust this if using a different video format
          });

          videoSignedUrl = await getSignedUrl(s3, videoCommand, { expiresIn: 3600 }); // URL valid for 1 hour
        }

        // If lesson has a thumbnail URL, generate a signed URL for the thumbnail
        if (lesson.thumbnailUrl) {
          const thumbnailCommand = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: lesson.thumbnailUrl,
            ResponseContentType: "image/jpeg", // Adjust this if using a different image format
          });

          try {
            thumbnailSignedUrl = await getSignedUrl(s3, thumbnailCommand, { expiresIn: 3600 }); // URL valid for 1 hour
          } catch (err) {
            console.error("Error generating thumbnail signed URL:", err);
            thumbnailSignedUrl = null; // Fallback to null if error occurs
          }
        }

        // Return the lesson data with both signed URLs for video and thumbnail
        return {
          ...lesson.toObject(),
          videoSignedUrl,
          thumbnailSignedUrl,
        };
      })
    );

    return res.status(200).json(new ApiResponse(200, lessonsWithSignedUrls, "Lessons fetched successfully"));
  } catch (error) {
    console.error("Error in getAllLessonsFromCourseId:", error);
    throw new ApiError(500, error.message || "Something went wrong while fetching lessons");
  }
});







const addLesson = asyncHandler(async (req, res) => {
  try {
    const { courseId, title, content, isFree, order } = req.body;

    // Check if the course exists
    const course = await Course.findById(courseId);

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    // Ensure only the instructor can add lessons
    if (course.instructorId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Not authorized to add lessons to this course");
    }

    // Ensure only instructors can create lessons
    if (req.user.role !== "instructor") {
      throw new ApiError(400, "Only instructors can create lessons");
    }

    // Check if file is provided
    if (!req.file || !req.file.path) {
      throw new ApiError(400, "Lesson file is missing");
    }

    // Generate file key for S3
    const fileKey = `lessons/${Date.now()}_${req.file.originalname}`;

    // Upload file to S3
    const result = await uploadOnS3(req.file.path, fileKey);

    if (!result || !result.fileKey) {
      throw new ApiError(500, "Failed to upload lesson file to S3");
    }

    // Create lesson
    const lesson = new Lesson({
      courseId,
      title,
      content,
      videoUrl: result.fileKey, // Ensure `uploadOnS3` returns `fileKey`
      isFree,
      order,
    });

    await lesson.save();

    return res.status(201).json(new ApiResponse(201, lesson, "Lesson created successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something went wrong while creating the lesson");
  }
});


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

// Controller to handle course purchase
const purchaseCourse = asyncHandler(async (req, res) => {
  try {
    const { studentId } = req.params; // Get student ID from URL params
    const { courseId } = req.body; // Get course ID from the request body

    // Fetch student details
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json(new ApiResponse(404, [], "Student not found"));
    }

    // Fetch course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json(new ApiResponse(404, [], "Course not found"));
    }

    // Calculate expiry date (2 minutes from now)
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 2); // 2 minutes

    // Check if the student has already purchased the course
    const alreadyPurchased = student.purchasedCourses.some(
      (purchase) => purchase.courseId.toString() === courseId
    );

    if (alreadyPurchased) {
      return res.status(400).json(new ApiResponse(400, [], "Course already purchased"));
    }

    // Add the course to the student's purchasedCourses array
    student.purchasedCourses.push({
      courseId,
      expiryDate,
    });

    // Save the updated student document
    await student.save();

    return res.status(200).json(new ApiResponse(200, [], "Course purchased successfully"));
  } catch (error) {
    console.error("Error in purchaseCourse:", error);
    throw new ApiError(500, error.message || "Something went wrong while processing the course purchase");
  }
});



 const payFromRazorpay = asyncHandler(async (req, res) => {
  try {
    const { courseId, amount } = req.body;

    // Create a Razorpay order
    const options = {
      amount: amount, // Amount in paise
      currency: "INR",
      receipt: `receipt_${courseId}`, // Unique receipt ID
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json(new ApiResponse(200, order, "Razorpay order created successfully"));
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new ApiError(500, error.message || "Something went wrong while creating Razorpay order");
  }
})

const verifyPayment = asyncHandler(async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, courseId } = req.body;

    // ✅ Get studentId from authenticated user
    const studentId = req.user._id; // Retrieved from verifyJWT middleware

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json(new ApiResponse(400, [], "Invalid course ID"));
    }

    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    // ✅ Verify Razorpay payment signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json(new ApiResponse(400, [], "Invalid payment signature"));
    }

    // ✅ Fetch student details
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json(new ApiResponse(404, [], "Student not found"));
    }

    // ✅ Fetch course details
    const course = await Course.findById(courseObjectId);
    if (!course) {
      return res.status(404).json(new ApiResponse(404, [], "Course not found"));
    }

    // ✅ Check if the student already owns the course
    const alreadyPurchased = student.purchasedCourses.some(
      (purchase) => purchase.courseId.toString() === courseId
    );

    if (alreadyPurchased) {
      return res.status(400).json(new ApiResponse(400, [], "Course already purchased"));
    }

    // ✅ Calculate expiry date (2 minutes from now)
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 2);

    // ✅ Add course to student's purchasedCourses
    student.purchasedCourses.push({
      courseId,
      expiryDate,
    });

    await student.save();

    // ✅ Store payment details in the database
    const paymentRecord = new Payment({
      studentId,
      courseId,
      razorpay_payment_id,
      razorpay_order_id,
      amount: course.price, // Assuming course has a price field
      status: "Success",
    });

    await paymentRecord.save();

    return res.status(200).json(new ApiResponse(200, [], "Payment verified and course access granted"));
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    throw new ApiError(500, error.message || "Something went wrong during payment verification");
  }
});


export {
   createCourse,
   getAllCourses,
   createLesson,
   addVideoToCourse,
   toggleLessonLock,
   purchaseCourse,
   verifyPayment,
   payFromRazorpay,
   deleteLessonByLessonId,
   getAllCoursesFromUserId,
   lessonUpdateByLessonId,
   getAllLessonsFromCourseId,
   getCoursesForStudents,
   addLesson,
   getAllVideos,
   getAllCoursesByCategory
}