const router = require("express").Router()
const { body } = require("express-validator")

const isAuth = require("../util/auth")
const listController = require("../controllers/list")

//GEt lists
router.get("/lists", listController.getLists)

//GET only the categories of the lists on this fetch
router.get("/lists/categories", listController.getListsCategories)

//GET an especific list
router.get("/lists/:listId", listController.getList)

//POST list
router.post("/lists", isAuth, [
    body("title", "Invalid title.").notEmpty(),
    ], listController.createList)

//PATCH list
router.patch("/lists/:listId", isAuth, [
    body("title", "Invalid name.").optional().trim().notEmpty(),
    ], listController.patchList)

//DELETE list
router.delete("/lists/:listId", isAuth, listController.deleteList)

//GET reviews in a list
router.get("/lists/:listId/reviews", listController.getReviewsFromList)

//Add a review into a list
router.post("/lists/:listId/reviews/:reviewId", isAuth, listController.addReviewToList)

//Remove a review from a list
router.delete("/lists/:listId/reviews/:reviewId", isAuth, listController.removeReviewFromList)

//POST followers
router.post("/lists/:listId/followers", isAuth, listController.followList)

//DELETE followers
router.delete("/lists/:listId/followers", isAuth, listController.unfollowList)

module.exports = router