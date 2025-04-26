const router = require("express").Router()
const { body } = require("express-validator")

const isAuth = require("../util/auth")
const reviewController = require("../controllers/review")

const INTERESTS_LIST = require("../util/constants").INTERESTS_LIST
const interests_db_name = INTERESTS_LIST.map(interest => interest[0])

//GET reviews
router.get("/reviews/", reviewController.getReviews)

//GET only the categories of the reviews on this fetch
router.get("/reviews/categories", reviewController.getReviewsCategories)

//GET review
router.get("/reviews/:reviewId", reviewController.getReview)

//POST review
router.post("/reviews", isAuth, [
    body("title", "Invalid name.").notEmpty(),
    body("type").isIn(interests_db_name).withMessage("Invalid type."),
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
    body("type").isIn(interests_db_name).withMessage("Invalid type."),
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