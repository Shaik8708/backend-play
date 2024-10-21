import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api_error.js";
import { ApiResponse } from "../utils/api_response.js";
import { asyncHandler } from "../utils/async_handler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page, limit, query, sortBy, sortType, userId } = req.query;

    //! query is the string text given by user in search
    //! soryBy is the value like updated time, duration, etc
    //! sortType is like ascending or descending
    //TODO: get all videos based on query, sort, pagination

    const options = {
        page: page || 1,
        limit: limit || 10,
    };

    let sortOptions = {
        createdAt: 0
    };

    if(sortBy == "createdAt"){
        sortOptions = {
            createdAt: sortType
        }
    }else if(sortBy == "duration"){
        sortOptions = {
            duration: sortType
        }  
    }

    if (userId && mongoose.isValidObjectId(userId)) {
        const aggregateUserVideos = Video.aggregate([
            {
                $match: {
                    owner: mongoose.Types.ObjectId(userId),
                },
            },
            {
                // this is to get the subscribers list and add it in the response
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerData",
                },
            },
            {
                $unwind: "$ownerData", // Unwind to access the owner object directly
            },
            {
                // this is to decide what data to be sent on the response to avoud load
                $project: {
                    thumbnail: 1,
                    "ownerData.fullName": 1,
                    "ownerData.avatar": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1
                },
            },
        ]).sort(sortOptions);

        const userVideos = await Video.aggregatePaginate(
            aggregateUserVideos,
            options
        );

        if (!userVideos) throw new ApiError(404, "No videos found!");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    userVideos,
                    "User videos fetched succesfully!"
                )
            );
    } else if (!userId) {
        if (!query) throw new ApiError(400, "Search text is needed");

        const aggregateQuery = Video.aggregate([
            {
                $match: {
                    isPublished: true,
                    title: { $regex: query, $options: "i" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerData",
                },
            },
            { $unwind: "$ownerData" },
            {
                $project: {
                    thumbnail: 1,
                    "ownerData.fullName": 1,
                    "ownerData.avatar": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1
                },
            },
        ]).sort(sortOptions);

        const result = await Video.aggregatePaginate(aggregateQuery, options);

        if (!result) throw new ApiError(400, "Videos not found!");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    result,
                    `Fetched videos with ${query} string!`
                )
            );
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, userName } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if (!title || title.length == 0)
        throw new ApiError(400, "Title is Required");
    if (!description || description.length == 0)
        throw new ApiError(400, "Description is Required");
    if (!userName || userName.length == 0)
        throw new ApiError(400, "userName is Required");

    const user = await User.findOne({
        userName,
    }).select("-password -refreshToken");

    if (!user) throw new ApiError(400, "User not found to upload the video.");
    const localVideoPath = req.files?.videoFile[0].path;
    const localThumbnailPath = req.files?.thumbnail[0].path;
    if (!localVideoPath) {
        throw new ApiError(400, "Video file required");
    }
    if (!localThumbnailPath) {
        throw new ApiError(400, "Thumbnail required");
    }

    const videoFile = await uploadOnCloudinary(localVideoPath);
    const thumbnail = await uploadOnCloudinary(localThumbnailPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file required");
    }
    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail required");
    }

    const dataToAdd = {
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title: title,
        description: description,
        isPublished: true,
        views: 0,
        duration: videoFile.duration?.toFixed(2),
        owner: user._id,
    };
    const video = await Video.create(dataToAdd);

    if (!video)
        throw new ApiError(500, "Something went wrong while adding video!");

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video published succesfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id

    if (!videoId) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findById(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched succesfully!"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    //TODO: update video details like title, description, thumbnail

    if (!title || title.length == 0)
        throw new ApiError(400, "Title is Required");
    if (!description || description.length == 0)
        throw new ApiError(400, "Description is Required");

    const localThumbnailPath = req.file?.path;

    if (!localThumbnailPath) throw new ApiError(400, "Thumbnail not found!");

    const thumbnail = await uploadOnCloudinary(localThumbnailPath);

    if (!thumbnail)
        throw new ApiError(
            500,
            "Something went wrong while uploading thumbnail to cloud!"
        );

    const videoToUpdate = {
        thumbnail: thumbnail.url,
        title: title,
        description: description,
    };

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: videoToUpdate,
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated sucesfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    if (!videoId) throw new ApiError(404, "Video not found!");

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "video deleted succesfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) throw new ApiError(400, "Video not found by ID!");

    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found");

    const togglePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: video.isPublished ? false : true,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, togglePublish, "Toggle publish succesful"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
