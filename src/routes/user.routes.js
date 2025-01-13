import { Router } from "express";
import { 
    loginUser, 
 
    registerUser, 

    updateUserCoverImage, 
  
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";




const router = Router()

router.route("/register").post(
    upload.fields([

        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

    router.post('/login', loginUser);

//secured routes
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

// router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
// router.route("/history").get(verifyJWT, getWatchHistory)

export default router