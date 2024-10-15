import { Router } from "express";
import {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);// working

router.route("/login").post(loginUser);// working

//Secured Routes
router.route("/logout").post(verifyJWT, logoutUser);// working
router.route("/refresh-token").post(refreshAccessToken);// working

router.route("/change-password").post(verifyJWT, changeCurrentPassword);// working 
router.route("/current-user").get(verifyJWT, getCurrentUser);// working
router.route("/update-account").patch(verifyJWT, updateAccountDetails);// works only if we pass both email and fullname 
router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);// working
router
    .route("/update-cover-image")
    .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:userName").get(verifyJWT, getUserChannelProfile);// working 
router.route("/watch-history").get(verifyJWT, getWatchHistory);// working

export default router;
