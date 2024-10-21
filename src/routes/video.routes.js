import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(getAllVideos)// works only with the all videos but need to add with filters
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );// working

router
    .route("/:videoId")
    .get(getVideoById)// working
    .delete(deleteVideo)// working
    .patch(upload.single("thumbnail"), updateVideo);// working

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);// working

export default router