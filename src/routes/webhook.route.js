import { Router } from "express";


import { razorpayWebhook } from "../controllers/webhook.controller.js";

const router = Router()


router.route("/verification").post(razorpayWebhook); //Yes

export default router