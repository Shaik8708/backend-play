import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/api_error.js"
import {ApiResponse} from "../utils/api_response.js"
import {asyncHandler} from "../utils/async_handler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    console.log(videoId, page, limit , "Get comment method");

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {comment, videoId, commenter} = req.body;
    console.log(comment, videoId, commenter, "add comment");

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }