const router = require("express").Router()

const userController = require("../controllers/user")
const isAuth = require("../util/auth")

//GET users
router.get("/users", userController.getUsers)

//GET one user
router.get("/users/:userId", userController.getUser)

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