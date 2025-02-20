import { Router } from "express";
import { 
    loginUser, 
    teacherLogin,
    uploadProfilePic,
    registerUser, 
    refreshAccessToken,
    logoutUser,
    getCurrentUser,

  
} from "../controllers/user.controller.js";



import {

    createOrder, 
    verifyPayment,
    razorpayWebhook
} from "../controllers/payment.controller.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router = Router();


router.post("/verify-payment", verifyJWT, verifyPayment);

router.post("/create-razorpay-order" ,verifyJWT, createOrder )


