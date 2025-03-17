const router = require("express").Router()
const { body } = require("express-validator")

const userController = require("../controllers/user")
const isAuth = require("../util/auth")
const User = require("../models/user")

//GET users
router.get("/users", userController.getUsers)

//GET logged user
router.get("/users/myuser", isAuth, userController.getAuthenticatedUser)

//GET one user
router.get("/users/:userId", userController.getUser)

//PATCH your own user
router.patch("/users", isAuth, [
    body("username").trim().custom(async (value, {req}) => {
        const user = await User.findOne({username: value})
        if(user && user._id.toString() !== req.userId.toString()){
            return Promise.reject("Username already in use.")
        }
    }),
    body("username", "Username can't be empty!").trim().notEmpty(),
], userController.patchMyUser)

//DELETE your own user
router.delete("/users", isAuth, userController.deleteMyUser)

//////////////////////////////////////////////////////////////////////////
//GET reviwws from a user
router.get("/users/:userId/reviews", userController.getReviewsFromUser)

//GET lists from a user
router.get("/users/:userId/lists", userController.getListsFromUser)

//TODO: GET the followers of a user

//TODO: GET the following of a user

//Follow a user
router.post("/users/:userId/followers", isAuth, userController.followUser)

//Unfollow a user
router.delete("/users/:userId/followers", isAuth, userController.unfollowUser)

module.exports = router