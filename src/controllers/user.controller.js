import {asyncHandler} from '../utils/async_handler.js';
import {ApiError} from "../utils/api_error.js";
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/api_response.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {fullName, email, userName, password} = req.body;
    if ([fullName, email, userName, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required.");
    }
    // else{
    //     res.status(200).json({msg:"ok"})
    // }
    //! need to validate for email syntax

    const existedUser = await User.findOne({
        $or: [{email}, {userName}]
    });

    if(existedUser){
        throw new ApiError(409, "User with this email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files?.coverImage){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalPath) throw new ApiError(400, "Avatar image is required");
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar) throw new ApiError(400, "Avatar image is required");

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        userName: userName.toLowerCase(),
        email,
        coverImage: coverImage?.url || "",
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user.")
    } else {
        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered succesfully", 200)
        )
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const {email, userName, password} = req.body;

    if(!(userName || email)){
        throw new ApiError(400, "Username or email required!");
    }

    const user = await User.findOne({
        $or: [{userName}, {email}]
    });

    if(!user){
        throw new ApiError(404, "User does not exist!");
    }

    const isValidPassword = await user.isPasswordCorrect(password);

    if(!isValidPassword){
        throw new ApiError(402, "Invalid Password!");
    }

    let {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    // user.refreshToken = refreshToken; // no need
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    accessToken = await accessToken;
    refreshToken = await refreshToken;

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
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },{
        new: true
    });

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User Logged out succesfully!")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) throw new ApiError(401, "Unauthorized request while refreshing!");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
    
        if(!user) throw new ApiError(401, "Invalid refresh token")
    
        if(incomingRefreshToken !== user.refreshToken) throw new ApiError(401, "Refresh token is expired or invalid")
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        let {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
        
        accessToken = await accessToken;
        newRefreshToken = await newRefreshToken;
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {
                accessToken, refreshToken: newRefreshToken
            }, "Access token refreshed!")
        )
    } catch (error) {
        throw new ApiError(401, "Invalid ref token!")
    }
})

export {registerUser, loginUser, logoutUser, refreshAccessToken}