const fs = require("fs")
const path = require("path")

const mongoose = require("mongoose")
const { validationResult } = require("express-validator")

const User = require("../models/user")
const Review = require("../models/review")
const { getCategoryName, deleteImagesOnS3 } = require("../util/functions")

exports.getReviews = async(req, res, next) => {
    
    fields = [
        "_id",
        "title",
        "author",
        "type",
        "rating",
        "review",
        "totalLikes",
        "imagesUrls"
    ]

    const {
        search = "",
        sortBy = "createdAt", 
        order = "-1", 
        limit = null, 
        skip = 0,
        author = null,
        minRating = 0,
        maxRating = 100,
        minDate = new Date(0),
        maxDate = Date.now(),
        category = null,
    } = req.query

    const categories = category ? category.split(",") : null
    const authorArray = author ? (author.split(",")).map(author => new mongoose.Types.ObjectId(`${author}`)) : null 
    
    const filter = {
        "title": RegExp(search, "i"),
        ...(author ? {"author": {$in: authorArray}} : {}),
        "rating": {$gte: minRating, $lte: maxRating},
        "createdAt": {$gte: minDate, $lte: maxDate},
        ...(category ? {"type": {$in: categories}} : {})
    }

    const options = { 
        sort: {[sortBy]: +order},
        ...(limit ? {limit: limit} : {}),
        skip: skip
    }

    try{

        if(!["updatedAt", "createdAt", "rating"].includes(sortBy)){
            const error = new Error("Invalid sort field")
            error.statusCode = 400
            throw error
        }

        if(!["-1", "1"].includes(order)){
            const error = new Error("Invalid order field")
            error.statusCode = 400
            throw error
        }

        const reviews = await Review.find(filter, fields, options).populate({
            path: "author",
            select: "_id username profilePicUrl"
        })
        res.status(200).json({reviews})
    }catch(error){
        next(error)
    }
} 

exports.getReview = async (req, res, next) => {
    const reviewId = req.params.reviewId
    
    try{
        const review = await Review.findById(reviewId).populate("author", ["_id", "username"])

        if(!review){
            const error = new Error("Review not found!")
            error.statusCode = 404
            throw error
        }
        
        return res.json({review})

    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.createReview = async (req, res, next) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }

    let imagesUrls
    if(req.files?.length > 0){ //verificando as imagens
        imagesUrls = req.files.map(image => image.key)
    }else{
        imagesUrls = ["images/default-review-pic.jpg"]
    }

    const title = req.body.title
    const author = req.userId
    const type = req.body.type
    const rating = req.body.rating
    const review = req.body.review

    const user = await User.findById(author)
    if(!user){
        const error = new Error("User not found.")
        error.statusCode = 404
        next(error)
    }

    const session = await mongoose.startSession() //abre uma sesssao
    session.startTransaction() //inicia uma transacao

    try{
        const userReview = await new Review({
            title,
            author,
            type,
            rating,
            review,
            imagesUrls: imagesUrls
        }).save({session: session})

        user.reviews.push(userReview._id)
        await user.save({session: session})

        await session.commitTransaction() //comita a transaçao
        session.endSession()
        return res.json({message: "Review created.", review: userReview})

    }catch(error){
        await session.abortTransaction() //aborta a transaçao
        session.endSession()
        error.statusCode = 500
        next(error)
    }
}

exports.patchReview = async (req, res, next) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }

    const reviewId = req.params.reviewId

    try{
        //verificando se todas as keys fazem parte do modelo
        for ([key, value] of Object.entries(req.body)){
            if(!["title", "rating", "review", "type", "image"].includes(key)){
                const error = new Error(`Invalid '${key}' field. Only title, rating, type, image and review can be patched.`)
                error.statusCode = 422
                throw error
            }
        }

        const review = await Review.findById(reviewId)

        if(!review){
            const error = new Error("Review not found!")
            error.statusCode = 404
            throw error
        }
        if(req.userId.toString() !== review.author.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 403
            throw error
        }

        const oldImages = [...review.imagesUrls]
        
        let keptImages = []
        if(req.body.image){
            keptImages = typeof req.body.image === "string" ? [req.body.image] : req.body.image
        }

        const deletedImages = oldImages.filter(image => !keptImages.includes(image) && (image !== "images/default-review-pic.jpg") )
        //deleta no S3 as imagens deletadas no frontend
        if(deletedImages.length > 0) deleteImagesOnS3(deletedImages)

        let newImages = []
        if(req.files.length > 0){ //tem imagem nova
            newImages = req.files.map(image => image.key)
        }

        let imagesUrls = [...keptImages, ...newImages]
        if(imagesUrls.length === 0) {
            imagesUrls = ["images/default-review-pic.jpg"]
        }

        const patchedBody = {
            title: req.body.title,
            rating: req.body.rating,
            review: req.body.review,
            type: req.body.type,
            imagesUrls: imagesUrls
        }

        const updatedReview = await Review.findOneAndUpdate({_id: reviewId}, patchedBody, {new: true})

        res.status(200).json({
            message: `Review _id:${reviewId} updated successfully.`,
            review: updatedReview
        })
    }
    catch(error){
        next(error)
    }
}

exports.deleteReview = async (req, res, next) => {    
    const reviewId = req.params.reviewId

    try{
        const userReview = await Review.findById(reviewId)

        if(!userReview){
            const error = new Error("Review does not existed.")
            error.statusCode = 404
            throw error
        }

        if(userReview.author.toString() !== req.userId.toString()){
            const error = new Error("User not authorized.")
            error.statusCode = 403
            throw error
        }

        imagesToDelete = userReview.imagesUrls.filter(imageUrl => imageUrl !== "images/default-review-pic.jpg")
        if(imagesToDelete.length > 0) deleteImagesOnS3(imagesToDelete)

        await Review.findByIdAndDelete(reviewId)

        return res.status(200).json({message: `Review _id:${reviewId} deleted successfully.`})

    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }   
}

exports.likePost = async (req, res, next) => {
    const reviewId = req.params.reviewId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const review = await Review.findById(reviewId)
        
        if(!review){
            const error = new Error("Review not found.")
            error.statusCode = 404
            throw error
        }

        const user = await User.findById(req.userId)

        if(user.likedReviews.includes(review._id)){
            const error = new Error("This user already likes this post.")
            error.statusCode = 403
            throw error
        }

        user.likedReviews.push(review._id)
        
        review.likes.push(req.userId)
        review.totalLikes += 1

        await user.save({session})
        await review.save({session})

        await session.commitTransaction()
        await session.endSession()  
        res.status(200).json({message: `User _id:${req.userId} liked review _id:${review._id}.`})      

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }

}

exports.deslikePost = async (req, res, next) => {
    const reviewId = req.params.reviewId

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const review = await Review.findById(reviewId)
        
        if(!review){
            const error = new Error("Review not found.")
            error.statusCode = 404
            throw error
        }

        const user = await User.findById(req.userId)

        if(!user.likedReviews.includes(review._id)){
            const error = new Error("This user does not likes this post.")
            error.statusCode = 403
            throw error
        }

        user.likedReviews.pull(review._id)
        
        review.likes.pull(req.userId)
        review.totalLikes -= 1

        await user.save({session})
        await review.save({session})

        await session.commitTransaction()
        await session.endSession()  
        res.status(200).json({message: `User _id:${req.userId} desliked review _id:${review._id}.`})      

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }

}

exports.getReviewsCategories = async (req, res, next) => {

    const {
        search = "",
        author = null,
        minRating = 0,
        maxRating = 100,
        minDate = new Date(0),
        maxDate = Date.now(),
    } = req.query

    const authorArray = author ? (author.split(",")).map(author => new mongoose.Types.ObjectId(`${author}`)) : null 

    const filter = {
        ...(search ? {"title": RegExp(search, "i")} : {}),
        ...(author ? {"author": {$in: authorArray}} : {}),
        "rating": {$gte: +minRating, $lte: +maxRating},
        "createdAt": {$gte: new Date(minDate), $lte: new Date(maxDate)},
    }

    try{

        const categoryNumber = await Review.aggregate([
            {
                $match: filter
            },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ])
        
        res.status(200).json({
            categories: categoryNumber.map(categoryObj => {
                return {
                    categoryId: categoryObj._id,
                    categoryName: getCategoryName(categoryObj._id),
                    count: categoryObj.count
                }
            })
        })
    }catch(error){
        next(error)
    }
}
