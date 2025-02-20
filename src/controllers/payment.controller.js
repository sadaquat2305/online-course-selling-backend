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


// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });


const createOrder = asyncHandler(async (req, res) => {
    const { courseId, amount } = req.body;
    const studentId = req.user.id; // Assuming user is authenticated
  
    if (!courseId || !amount) throw new ApiError(400, "Invalid request");
  
    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };
  
    const order = await razorpay.orders.create(options);
    const payment = new Payment({
      studentId,
      courseId,
      razorpay_order_id: order.id,
      amount,
      status: "Pending",
    });
  
    await payment.save();
    res.json({ success: true, data: order });
  });
  

  const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
    const studentId = req.user.id;
  
    const paymentRecord = await Payment.findOne({ razorpay_order_id });
    if (!paymentRecord) throw new ApiError(404, "Payment record not found");
  
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  
    if (expectedSignature !== razorpay_signature) throw new ApiError(400, "Invalid signature");
  
    // ✅ Grant course access
    const student = await User.findById(studentId);
    if (!student) throw new ApiError(404, "Student not found");
  
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 18);
    student.purchasedCourses.push({ courseId, expiryDate });
    await student.save();
  
    // ✅ Update payment record
    paymentRecord.status = "Success";
    await paymentRecord.save();
  
    res.json({ success: true, message: "Payment verified, course access granted" });
  });


  const razorpayWebhook = asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);
  
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expectedSignature = hmac.digest("hex");
  
    if (signature !== expectedSignature) throw new ApiError(400, "Invalid signature");
  
    if (req.body.event === "payment.captured") {
      const { id, order_id, amount } = req.body.payload.payment.entity;
      const paymentRecord = await Payment.findOne({ razorpay_order_id: order_id });
  
      if (paymentRecord) {
        paymentRecord.status = "Success";
        await paymentRecord.save();
      }
    }
  
    res.status(200).json({ success: true });
  });


  export {

    createOrder, 
    verifyPayment,
    razorpayWebhook
  }