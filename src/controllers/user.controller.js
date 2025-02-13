import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"

import { uploadOnS3} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        
        const accessToken = await user.generateAccessToken()
        console.log("Before refresh Token generateAccessAndRefereshTokens")
        const refreshToken = await user.generateRefreshToken()

        console.log("After refresh Token generateAccessAndRefereshTokens")

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password , role } = req.body;

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
        throw new ApiError(400, "Password is required");
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

    const user = await User.create({ name, email, password , role});

    //, profilePicUrl : result.fileKey 

    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, user, "User registered successfully")
    );
});


const loginUser = asyncHandler(async (req, res) =>{

    const {email, password} = req.body

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

    if(!isPasswordValid){
        throw new ApiError(404 , "User password is not correct")
    }

    const {accessToken , refreshToken } =  await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password  -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken , refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const uploadProfilePic = asyncHandler(async (req , res) => {

      const profilePicLocalPath = req.file?.path

    if(!profilePicLocalPath){

        throw new ApiError(400 , "Profile Pic is missing ")
    }

    const fileKey = `uploads/${Date.now()}_${req.file.originalname}`;

    const result = await uploadOnS3(req.file.path , fileKey)

    if(!result){

       throw new ApiError(500 , "Result is not found from S3")

    }

    const user = await User.create({profilePicUrl : result.fileKey });

    

    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, user, "User registered successfully")
    );



})

const teacherLogin = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const {email, password , role} = req.body

    console.log(`User Role From Postman :- ${role}`) 

    console.log(email);

    
    

    if (!email) {
        throw new ApiError(400, "Email is required")
    }
    
 
    const user = await User.findOne({ email })

    // First, check if user exists
     if (!user) {
        
            throw new ApiError(404, "Teacher does not exist");
        }

    if(user.role != "teacher"){
        throw new ApiError(404 , "User is not teacherrrrr")
    }


    console.log(`Teacher From MongoDB :- ${ user }`)

    console.log(`User Role :- ${user.role}`)

    if (!user) {
        throw new ApiError(404, "Teacher does not exist")
    }
    console.log(password)
    console.log(user.password);

   const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404 , "Teacher Credentials are not Correct")
    }

    const {accessToken , refreshToken } =  await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password  -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken , refreshToken
            },
            "Teacher logged In Successfully"
        )
    )

})

const getCurrentUser = asyncHandler(async(req, res) => {
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
                    { accessToken, 
                        refreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const logoutUser = asyncHandler(async(req, res) => {
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






const updateUserCoverImage = asyncHandler(async(req, res) => {
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
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
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
    refreshAccessToken,
    logoutUser,
    teacherLogin,
    uploadProfilePic,
    getCurrentUser,
    updateUserCoverImage,
    
}