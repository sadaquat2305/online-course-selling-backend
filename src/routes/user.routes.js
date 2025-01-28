import { Router } from "express";
import { 
    loginUser, 
 
    registerUser, 
    refreshAccessToken,
    logoutUser,

    updateUserCoverImage, 
  
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";




const router = Router()

router.route("/register").post(
    upload.none(),

    registerUser
    )

    router.post('/login', upload.none(), loginUser);

//secured routes

router.route("/logout").post(verifyJWT,  logoutUser)

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/refresh-token").post(refreshAccessToken)

// router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
// router.route("/history").get(verifyJWT, getWatchHistory)

export default router