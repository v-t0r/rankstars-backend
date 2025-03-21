const router = require("express").Router()
const { body } = require("express-validator")

const commentController = require("../controllers/comment")
const isAuth = require("../util/auth")

//GET comments from a review, list or comment
router.get("/:where/:whereId/comments", commentController.getComments)

//POST comment in a review, list or in a comment
router.post("/:where/:whereId/comments", isAuth, [
        body("content").trim().notEmpty().withMessage("Comment can't be empty.")
    ], 
    commentController.postComment)

//PATCH comment 
router.patch("/comments/:commentId", isAuth, [
    body("content").trim().notEmpty().withMessage("Comment can't be empty.")
], commentController.patchComment)

//DELETE comment
router.delete("/comments/:commentId", isAuth, commentController.deleteComment)

module.exports = router