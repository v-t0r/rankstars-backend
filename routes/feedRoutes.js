const router = require("express").Router()

const feedController = require("../controllers/feed")
const isAuth = require("../util/auth")

router.get("/feed/foryou", isAuth, feedController.getForYou)

module.exports = router