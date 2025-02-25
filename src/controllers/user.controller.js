import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

import { uploadOnS3 } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

// AWS S3 Client Setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = await user.generateAccessToken()
        console.log("Before refresh Token generateAccessAndRefereshTokens")
        const refreshToken = await user.generateRefreshToken()

        console.log("After refresh Token generateAccessAndRefereshTokens")

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    console.log("Request Body:", req.body);

    // const avatarLocalPath = req.file?.path;

    // console.log(`Profile Photo ${avatarLocalPath}`);

    if (!name) {
        throw new ApiError(400, "Full name is required");
    }
    if (!email) {
        throw new ApiError(400, "Email is required");
    }
    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    if (!role) {
        throw new ApiError(400, "Role is required");
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, "User with email already exists");
    }

    // const profilePicLocalPath = req.file?.path

    // if(!profilePicLocalPath){

    //     throw new ApiError(400 , "Profile Pic is missing ")
    // }

    // const fileKey = `uploads/${Date.now()}_${req.file.originalname}`;

    // const result = await uploadOnS3(req.file.path , fileKey)

    // if(!result){

    //    throw new ApiError(500 , "Result is not found from S3")

    // }

    const user = await User.create({ name, email, password, role });

    //, profilePicUrl : result.fileKey 

    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, user, "User registered successfully")
    );
});

const createTeacher = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    console.log("Request Body:", req.body);

    // const avatarLocalPath = req.file?.path;

    // console.log(`Profile Photo ${avatarLocalPath}`);

    if (!name) {
        throw new ApiError(400, "Full name is required");
    }
    if (!email) {
        throw new ApiError(400, "Email is required");
    }
    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    if (!role) {
        throw new ApiError(400, "Role is required");
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, "User with email already exists");
    }

    const profilePhotoLocalPath = req.file?.path

    console.log(profilePhotoLocalPath)

    if (!profilePhotoLocalPath) {
        throw new ApiError(400, "Profile Photo is missing")
    }

    const fileKey = `profilePhotos/${Date.now()}_${req.file.originalname}`;

    const result = await uploadOnS3(req.file.path, fileKey)

    if (!result) {
        throw new ApiError(500, "Result is not found from S3")
    }


    const user = await User.create({ 
        name, 
        email,
        password, 
        role,
        profilePicUrl: result.fileKey });

    //, profilePicUrl : result.fileKey 

    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, user, "Teacher  registeredddddd successfully")
    );
});

const adminLogin = asyncHandler(async (req, res) => {

    const { email, password } = req.body

    console.log(email);

    if (!email) {
        throw new ApiError(400, "Email is required")
    }


    const user = await User.findOne({ email })

    console.log(`User From MongoDB :- ${user}`)

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    if (user.role != "admin") {
        throw new ApiError(404, "User is not Admin")
    }

    console.log(password)
    console.log(user.password);

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "User password is not correct")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password  -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)

        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "Admin logged In Successfully"
            )
        )

})


const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body

    console.log(email);

    if (!email) {
        throw new ApiError(400, "Email is required")
    }


    const user = await User.findOne({ email })

    console.log(`User From MongoDB :- ${user}`)

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // if(user.role != "teacher"){
    //     throw new ApiError(404 , "User is not teacherrrrr")
    // }

    console.log(password)
    console.log(user.password);

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "User password is not correct")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password  -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)

        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const uploadProfilePic = asyncHandler(async (req, res) => {

    const profilePicLocalPath = req.file?.path

    if (!profilePicLocalPath) {

        throw new ApiError(400, "Profile Pic is missing ")
    }

    const fileKey = `uploads/${Date.now()}_${req.file.originalname}`;

    const result = await uploadOnS3(req.file.path, fileKey)

    if (!result) {

        throw new ApiError(500, "Result is not found from S3")

    }

    const user = await User.create({ profilePicUrl: result.fileKey });



    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, user, "User registered successfully")
    );



})

const teacherLogin = asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
  
    console.log(`User Role From Postman :- ${role}`);
    console.log(email);
  
    // Validate email
    if (!email) {
      throw new ApiError(400, "Email is required");
    }
  
    // Find the user by email
    const user = await User.findOne({ email });
  
    // Check if the user exists
    if (!user) {
      throw new ApiError(404, "Teacher does not exist");
    }
  
    // Check if the user is a teacher
    if (user.role !== "teacher") {
      throw new ApiError(404, "User is not a teacher");
    }
  
    console.log(`Teacher From MongoDB :- ${user}`);
    console.log(`User Role :- ${user.role}`);
  
    // Validate password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(404, "Teacher credentials are not correct");
    }
  
    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
  
    // Fetch the logged-in user (excluding sensitive fields)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    console.log(`Logged In User ${loggedInUser}`)
  
    // Generate Signed URL for Teacher's Profile Photo
    let profilePhotoSignedUrl = null;

    if (loggedInUser.profilePicUrl) {
      try {
        profilePhotoSignedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: loggedInUser.profilePicUrl,
            ResponseContentType: "image/jpeg", // Adjust based on your file type
          }),
          { expiresIn: 3600 } // URL expires in 1 hour
        );
      } catch (err) {
        console.error("Error generating profile photo signed URL:", err);
      }
    }
  
    // Set cookie options
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    // Return the response with the signed URL
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: {
              ...loggedInUser.toObject(), // Convert Mongoose document to plain object
              profilePhotoSignedUrl, // Include the signed URL for the profile photo
            },
            accessToken,
            refreshToken,
          },
          "Teacher logged in successfully"
        )
      );
  });

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
})



const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    console.log(`Incoming Refresh Token ${incomingRefreshToken}`);

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        // Generate new tokens
        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        // Store the new refresh token in the database
        user.refreshToken = refreshToken;
        await user.save();

        console.log("Generated Refresh Token:", refreshToken);


        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})






const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }




    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        )
})





export {
    registerUser,
    loginUser,
    adminLogin,
    createTeacher,
    refreshAccessToken,
    logoutUser,
    teacherLogin,
    uploadProfilePic,
    getCurrentUser,
    updateUserCoverImage,

}