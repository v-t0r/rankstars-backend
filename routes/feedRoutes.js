const router = require("express").Router()

const feedController = require("../controllers/feed")
const isAuth = require("../util/auth")

router.get("/feed/recent-posts", isAuth, feedController.getRecentPosts)

router.get("/feed/for-you", isAuth, feedController.getForYou)

router.get("/feed/following", isAuth, feedController.getFollowingFeed)

module.exports = router