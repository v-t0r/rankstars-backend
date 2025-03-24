const mongoose = require("mongoose")
const { validationResult } = require("express-validator")

const User = require("../models/user")
const Review = require("../models/review")
const List = require("../models/list")


exports.getLists = async(req, res, next) => {

    fields = [
        "_id",
        "title",
        "author",
        "reviews",
        "reviewsCount",
        "description",
    ]

    const {search = ""} = req.query
    
    try{
        const lists = await List.find({"title": RegExp(search, "i")}, fields).populate({
            path: "reviews",
            select: "_id imagesUrls"
        })
        res.status(200).json({lists})
    }catch(error){
        next(error)
    }
} 

exports.getList = async (req, res, next) => {
    const listId = req.params.listId

    //ordenacao
    const {sortBy = null, order = "1", quantity = null, offset = 0} = req.query

    try{

        if(!["updatedAt", "createdAt", "rating", null].includes(sortBy)){
            const error = new Error("Invalid sort field")
            error.statusCode = 400
            throw error
        }

        if(!["-1", "1", null].includes(order)){
            const error = new Error("Invalid order field")
            error.statusCode = 400
            throw error
        }

        const list = await List.findById(listId).populate([
            {
                path: "author",
                select: "_id username profilePicUrl"
            },
            {
                path: "reviews",
                ...(sortBy ? {options: {sort: {[sortBy]: +order}}} : {} ),
                populate : {
                    path: "author",
                    select: "_id username" 
                }
            }
        ])

        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }

        if(quantity){
            list.reviews = list.reviews.splice(offset, quantity)
        }
        
        
        return res.json({list})

    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.createList = async (req, res, next) => {
    const errors = validationResult(req)

    if(!errors.isEmpty){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }

    const title = req.body.title
    const author = req.userId
    const description = req.body.description    

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const user = await User.findById(author)

        if(!user){
            const error = new Error("User not authorized.")
            error.statusCode = 401
            throw error
        }

        const list = await new List({
            title,
            author,
            description
        }).save({session})

        user.lists.push(list._id)
        await user.save({session})

        await session.commitTransaction()
        await session.endSession()

        return res.status(200).json({message: "List created succesfully.", list})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.addReviewToList = async (req, res, next) => {
    const reviewId = req.params.reviewId 
    const listId = req.params.listId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{

        const review = await Review.findById(reviewId)
        if(!review){
            const error = new Error("No review with this id.")
            error.statusCode = 404
            throw error
        }

        const list = await List.findById(listId)
        if(!list){
            const error = new Error("No list with this id.")
            error.statusCode = 404
            throw error
        }

        if(list.author.toString() !== req.userId.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 401
            throw error
        }

        if(list.reviews.includes(review._id)){
            const error = new Error("Review already on this list.")
            error.statusCode = 401
            throw error
        }

        list.reviews.push(review._id)
        list.reviewsCount += 1
        review.lists.push(list._id)

        list.save({session})
        review.save({session})

        await session.commitTransaction()
        await session.endSession()

        return res.status(200).json({message: "Review added to list succesfully."})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.getReviewsFromList = async (req, res, next) => {
    const listId = req.params.listId
    const populate = req.query.populate
    let list

    if(populate === "true"){
        list = await List.findById(listId).populate("reviews")
    }else{
        list = await List.findById(listId)
    }

    if(!list){
        const error = new Error("List not found!")
        error.statusCode = 400
        throw error
    }

    res.json({reviews: list.reviews})

}
exports.removeReviewFromList = async (req, res, next) => {
    const listId = req.params.listId
    const reviewId = req.params.reviewId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
    
        const list = await List.findById(listId)

        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }

        if(list.author.toString() !== req.userId.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 403
            throw error
        }

        const review = await Review.findById(reviewId)

        if(!review){
            const error = new Error("Review not found!")
            error.statusCode = 404
            throw error 
        }

        list.reviews.pull(reviewId)
        list.reviewsCount -= 1
        review.lists.pull(listId)

        await list.save({session})
        await review.save({session})

        await session.commitTransaction()
        await session.endSession()

        res.status(200).json({message: "Review deleted from list successfully."})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()

        if(error.kind == "ObjectId"){
            error.message = "Incorrect Id format." 
        }
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.patchList = async (req, res, next) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }

    const listId = req.params.listId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        for ([key, value] of Object.entries(req.body)){
            if(!["title", "description", "reviews"].includes(key)){
                const error = new Error(`Invalid '${key}' key. Only title and description or reviews can be patched.`)
                error.statusCode = 422
                throw error
            }
        }

        const list = await List.findById(listId)

        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }
        if(req.userId.toString() !== list.author.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 403
            throw error
        }
        
        const oldReviewList = [...list.reviews]

        const newReviewList = req.body.reviews !== undefined ? req.body.reviews : [] 

        const removedReviews = oldReviewList.filter(review => !newReviewList.includes(review.toString()))

        for(const reviewId of removedReviews){
            const review  = await Review.findById(reviewId)
            if(review){
                review.lists.pull(listId)
                review.save({session})
            }
        }

        const reviewsCount = newReviewList.length

        const updatedList = await List.findOneAndUpdate(
            {_id: listId}, 
            {
                title: req.body.title, 
                description: req.body.description,
                reviews: newReviewList,
                reviewsCount
            }, 
            {new: true}
        )

        await session.commitTransaction()
        await session.endSession()

        res.status(200).json({
            message: `List _id:${listId} updated successfully.`,
            list: updatedList
        })
    }
    catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }
}

exports.deleteList = async (req, res, next) => {
    const listId = req.params.listId

    try{
        const list = await List.findById(listId)

        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }

        if(list.author.toString() !== req.userId.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 403
            throw error
        }

        await List.findByIdAndDelete(listId)

        res.status(200).json({message: "List deleted successfully."})

    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }

}

exports.followList = async (req, res, next) => {
    const listId = req.params.listId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const list = await List.findById(listId)
        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }

        if(list.followers.includes(req.userId)){
            const error = new Error("This user already follows this list.")
            error.statusCode = 403
            throw error
        }

        const user = await User.findById(req.userId)

        user.followingLists.push(list._id)

        list.followers.push(req.userId)

        await user.save({session})
        await list.save({session})

        await session.commitTransaction()
        await session.endSession()

        res.status(200).json({message: `User _id:${req.userId} is now following list _id:${listId}.`})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }
}

exports.unfollowList = async (req, res, next) => {
    const listId = req.params.listId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const list = await List.findById(listId)
        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }

        if(!list.followers.includes(req.userId)){
            const error = new Error("This user does not follows this list.")
            error.statusCode = 403
            throw error
        }

        const user = await User.findById(req.userId)

        user.followingLists.pull(list._id)

        list.followers.pull(req.userId)

        await user.save({session})
        await list.save({session})

        await session.commitTransaction()
        await session.endSession()

        res.status(200).json({message: `User _id:${req.userId} unfollowed list _id:${listId}.`})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }
}