const router = require("express").Router()
const { body } = require("express-validator")

const isAuth = require("../util/auth")
const reviewController = require("../controllers/review")

//GET review
router.get("/reviews/:reviewId", reviewController.getReview)

//POST review
router.post("/reviews", isAuth, [
    body("title", "Invalid name.").notEmpty(),
    body("type")
        .notEmpty().withMessage("Type cannot be empty.")
        .isIn(["movie", "tvshow", "videogame"]).withMessage("Invalid type."),
    // body("review", "The review cannot be empty.").notEmpty(),
    body("rating").custom(async (value, {req}) => {
            if( +value < 0 || +value > 100){
                console.log("entrou")
                return Promise.reject("Invalid rating value. Must be beetween 0 and 100.")
            }
        }),
    ], reviewController.createReview)

//PATCH review
router.patch("/reviews/:reviewId", isAuth, [
    body("title", "Name can't be empty.").optional().notEmpty(),
    // body("review", "The review can't' be empty.").optional().notEmpty(),
    body("rating").optional().custom(async (value, {req}) => {
        if( +value < 0 || +value > 100){
            console.log("entrou")
            return Promise.reject("Invalid rating value. Must be beetween 0 and 100.")
        }
    }),
    ], reviewController.patchReview)

//DELETE review
router.delete("/reviews/:reviewId", isAuth, reviewController.deleteReview)

//Likes a reviews
router.post("/reviews/:reviewId/likes", isAuth, reviewController.likePost)

//Deslikes a reviews
router.delete("/reviews/:reviewId/likes", isAuth, reviewController.deslikePost)

module.exports = router