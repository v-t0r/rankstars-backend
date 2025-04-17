const { startSession } = require("mongoose")
const { validationResult } = require("express-validator")

const Comment = require("../models/comment")
const Review = require("../models/review")
const List = require("../models/list")


exports.getComments = async (req, res, next) => {
    const {where, whereId} = req.params
    const answers = req.query.answers

    if(!["reviews", "lists", "comments"].includes(where)){
        const error = new Error("Invalid route.")
        error.statusCode = 404
        throw next(error)
    }

    let fetchedData
    let dataType

    const populateObject = {
        path: "comments",
        options: { sort: {createdAt: -1 }},
        populate: [{
            path: "author",
            select: "_id username profilePicUrl"
        },
        answers && {
            path: "comments",
            populate: {
                path: "author",
                select: "_id username profilePicUrl"
            }
        }].filter(Boolean)
    }

    try{

        if(where === "reviews"){
            fetchedData = await Review.findById(whereId).populate(populateObject)
            dataType = "Review"
        }else if(where === "lists"){
            fetchedData = await List.findById(whereId).populate(populateObject)
            dataType = "List"
        }else {
            fetchedData = await Comment.findById(whereId).populate(populateObject)
            dataType = "Comment" 
        }

        if(!fetchedData){
            const error = new Error(`${dataType} not found!`)
            error.statusCode = 404
            throw error
        }

        const comments = fetchedData.comments
        res.status(200).json(comments)

    }catch(error){
        next(error)
    }
    
}

exports.postComment = async (req, res, next) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }

    const { where, whereId } = req.params

    const session = await startSession()
    session.startTransaction()
    try{
        if(!["reviews", "lists", "comments"].includes(where)){
            const error = new Error("Invalid route.")
            error.statusCode = 404
            throw error
        }
        
        let fetchedElement
        let whereType
        if(where == "reviews"){
            fetchedElement = await Review.findById(whereId)
            whereType = "Review"
        }else if(where == "lists"){
            fetchedElement = await List.findById(whereId)
            whereType = "List"
        }else if(where == "comments"){
            fetchedElement = await Comment.findById(whereId)
            whereType = "Comment"
        }

        if(!fetchedElement){
            const error = new Error(`${whereType} not found!`)
            error.statusCode = 404
            throw error
        }

        const comment = await new Comment({
            content: req.body.content,
            author: req.userId,
            where: whereId,
            whereType: whereType,
        }).save({session})

        fetchedElement.comments.push(comment._id)
        await fetchedElement.save({session})
        
        await session.commitTransaction()
        await session.endSession()
        res.status(200).json({message: "Comment posted successfully.", comment})
    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }
}

exports.patchComment = async (req, res, next) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }

    for ([key, value] of Object.entries(req.body)){
        if(!["content",].includes(key)){
            const error = new Error(`Invalid '${key}' field. Only the 'content' field can be patched.`)
            error.statusCode = 422
            return next(error)
        }
    }

    const userId = req.userId
    const { commentId } = req.params

    try{
        const comment = await Comment.findById(commentId)

        if(!comment){
            const error = new Error("Comment not found!")
            error.statusCode = 404
            throw error
        }

        if(comment.author != userId){
            const error = new Error("Not authorized!")
            error.statusCode = 403
            throw error
        }

        const patchedCotent = {content: req.body.content, isEdited: true}
        const updatedComment = await Comment.findOneAndUpdate({_id: commentId}, patchedCotent, {new: true})

        res.status(200).json({
            message: `Comment ${commentId} updated successfuly.`,
            comment: updatedComment
        })

    }catch(error){
        if(!error.statusCode) { error.statusCode = 500 }
        next(error) 
    }
}

exports.deleteComment = async (req, res, next) => {
    const { commentId } = req.params

    try{
        const comment = await Comment.findById(commentId)

        if(!comment){
            const error = new Error("Comment not found!")
            error.statusCode = 404
            throw error
        }

        if(comment.author.toString() !== req.userId.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 403
            throw error
        }

        await Comment.findByIdAndDelete(commentId)

        res.status(200).json({message: `Comment _id:${commentId} deleted successfully.`})

    }catch(error){
        next(error)
    }

}
