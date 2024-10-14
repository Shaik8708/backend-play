import {asyncHandler} from '../utils/async_handler.js';
import {ApiError} from "../utils/api_error.js";
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/api_response.js';

const registerUser = asyncHandler(async (req, res) => {
    const {fullName, email, userName, password} = req.body;
    if ([fullName, email, userName, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required.");
    }
    // else{
    //     res.status(200).json({msg:"ok"})
    // }
    //! need to validate for email syntax

    const existedUser = User.findOne({
        $or: [{email}, {userName}]
    });

    if(existedUser){
        throw new ApiError(409, "User with this email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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




export {registerUser}