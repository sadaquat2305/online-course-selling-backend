import { Router } from "express";
import { 
    loginUser, 
    teacherLogin,
    uploadProfilePic,
    adminLogin,
    createTeacher,
 
    registerUser, 
    refreshAccessToken,
    logoutUser,
    getCurrentUser,

    updateUserCoverImage, 
  
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";




const router = Router()

router.route("/register").post(
   upload.none() ,
    registerUser
    )




//     router.post('/login', upload.none(), loginUser);


router.route("/login").post(upload.none() , loginUser)

router.route("/create-teacher").post(
    upload.single('profilePhoto'), // Ensure this matches the field name used in Flutter
    createTeacher
);

router.route("/teacher-login").post(upload.none(), teacherLogin)
router.route('/admin-login').post(upload.none() , adminLogin)
// router.post('/teacher-login' , upload.none(),teacherLogin )

// router.post("/upload-profile-pic", upload.single("profilePic"), uploadProfilePic )

router.route("/upload-profile-pic").post( verifyJWT , upload.single("profilePic"), uploadProfilePic )

//secured routes

router.route("/logout").post(verifyJWT,  logoutUser);



router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT, getCurrentUser)

// router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
// router.route("/history").get(verifyJWT, getWatchHistory)

export default router