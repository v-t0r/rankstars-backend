const path = require("path")
const fs = require("fs")

const mongoose = require("mongoose")

const User = require("../models/user")
const List = require("../models/list")
const Review = require("../models/review")
const { validationResult } = require("express-validator")

exports.getAuthenticatedUser = async(req, res, next) => {
    const userId =  req.userId

    fields = [
        "_id", 
        "username", 
        "interests",
        "followers",
        "following",
        "reviews",
        "favReviews",
        "lists",
        "likedReviews",
        "followingLists",
        "profilePicUrl",
        "bannerPicUrl",
        "status",
        "createdAt",
    ]
    
    try{
        const user = await User.findById(userId, fields)
        res.status(200).json({user})
    }catch(e){
        next(error)
    }
}

exports.getUsers = async (req, res, next) => {
    fields = [
        "_id", 
        "username",
        "interests",
        "followers",
        "following",
        "reviews",
        "favReviews",
        "lists",
        "profilePicUrl",
        "bannerPicUrl",
        "status",
        "createdAt"
    ]

    const {
        search = "",
        sortBy = "createdAt", 
        order = "1",
        limit = null, 
        skip = 0,
        interests = null,
        minDate = new Date(0),
        maxDate = Date.now(),
        compact = "false"
    } = req.query

    const interestsArray = category ? interests.split(",") : null

    if(compact === "true"){
        fields = [
            "_id", 
            "username", 
        ]
    }

    const filter = {
        "username": RegExp(search, "i"),
        "createdAt": {$gte: minDate, $lte: maxDate},
        ...(interests ? {"interests": {$in: interestsArray}} : {})
    }

    const options = {
        sort: {[sortBy]: +order},
        ...(limit ? {limit: limit} : {}),
        skip: skip
    }

    try{
        const users = await User.find(filter, fields, options)
        res.status(200).json({users})
    }catch(error){
        next(error)
    }
}

exports.getUser = async (req, res, next) => {
    const userId = req.params.userId
    let {basicOnly = false} = req.query

    let fields = [
        "_id", 
        "username",
        "interests",
        "followers",
        "following",
        "reviews",
        "favReviews",
        "lists",
        "likedReviews",
        "followingLists",
        "profilePicUrl",
        "bannerPicUrl",
        "status",
        "createdAt"
    ]

    if(basicOnly === "true"){
        fields = [
            "_id", 
            "username", 
            "profilePicUrl",
        ]
    }

    try{
        const user = await User.findById(userId, fields).populate(basicOnly ? [] : [{
                path: "followers",
                select: "_id username profilePicUrl status"
            },
            {
                path: "following",
                select: "_id username profilePicUrl status"
            }
        ])
        if(!user){
            const error = new Error("User not found")
            error.statusCode = 404
            throw error
        }

        res.status(200).json({user})
    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.getReviewsFromUser = async (req, res, next) => {
    const userId = req.params.userId

    //ordenação padrão é por data descendente
    const {
        sortBy = "createdAt", 
        order = "-1", 
        limit = null, 
        skip = 0,
        minRating = 0,
        maxRating = 100,
        minDate = new Date(0),
        maxDate = Date.now(),
        category = null
    } = req.query

    const categories = category ? category.split(",") : null

    const filter = {
        "author": userId,
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

        const reviews = await Review.find(filter, null, options).populate({
                path: "author",
                select: "_id username"
            })

        res.status(200).json({reviews: reviews})

    }catch(error){
        if(error.kind == "ObjectId"){
            error.message = "Incorrect Id format." 
        }
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }

}

exports.getListsFromUser = async (req, res, next) => {
    const userId = req.params.userId

    const {
        sortBy = "createdAt", 
        order = "-1",
        limit = null,
        skip = 0,
        minDate = new Date(0),
        maxDate = Date.now(),
        category = null
    } = req.query

    const categories = category ? category.split(",") : null

    const filter = {
        "author": userId,
        "createdAt": {$gte: minDate, $lte: maxDate},
        ...(category ? {"type": {$in: categories}} : {})
    }

    const options = { 
        sort: {[sortBy]: +order},
        ...(limit ? {limit: limit} : {}),
        skip: skip
    }

    try{
        if(!["updatedAt", "createdAt"].includes(sortBy)){
            const error = new Error("Invalid sort field")
            error.statusCode = 400
            throw error
        }

        if(!["-1", "1"].includes(order)){
            const error = new Error("Invalid order field")
            error.statusCode = 400
            throw error
        }

        const lists = await List.find(filter, null, options).populate([
                {
                    path: "reviews",
                    select: "_id title author imagesUrls",
                    populate: {
                        path: "author",
                        select: "_id username"
                    }
                },
                {
                    path: "author",
                    select: "_id username"
                }
            ])

        res.status(200).json({lists: lists})

    }catch(error){
        if(error.kind == "ObjectId"){
            error.message = "Incorrect Id format." 
        }
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.patchMyUser = async (req, res, next) => {
    const userId = req.userId

    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const error = new Error("Validation failed.")
        error.statusCode = 422
        error.data = errors.array()
        return next(error)
    }
    
    try{

        for([key, value] of Object.entries(req.body)){
            if(!["username", "image", "status", "interests"].includes(key)){
                const error = new Error(`Invalid '${key}' field. Only username, porfilePicture, status and interests can be patched.`)
                error.statusCode = 422
                throw error
            }
        }

        const user = await User.findById(userId)

        if(!user){
            const error = new Error("User not found!")
            error.statusCode = 404
            throw error
        }

        if(req.body.username && req.body.username !== user.username){
            const usernameOwner = await User.findOne({username: req.body.username})

            if(usernameOwner){
                const error = new Error("This username is already in use")
                error.statusCode = 401
                throw error
            }
        }

        const oldProfilePicture = user.profilePicUrl
        let profilePicUrl = null
        if(!req.body.image && req.files.length > 0){
            profilePicUrl = req.files[0].path
            if(oldProfilePicture !== "images/default-profile-pic.jpg"){
                deleteImage(oldProfilePicture)
            } 
        }

        const patchedBody = {
            username: req.body.username,
            status: req.body.status,
            interests: req.body.interests,
            profilePicUrl: profilePicUrl ?? oldProfilePicture,
            interests: req.body.interests
        }

        const updatedUser = await User.findOneAndUpdate({_id: userId}, patchedBody, {new: true})

        res.status(200).json({
            message: "User updated sucessfully.",
            user: updatedUser
        })

    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.deleteMyUser = async (req, res, next) => {
    const userId = req.userId
     
    try{
        const user = User.findById(userId)

        if(!user){
            const error = new Error("User not found!")
            error.statusCode = 404
            throw error
        }

        await User.findByIdAndDelete(userId)
        res.status(200).json({"message": `User _id:${userId} deleted successfully.`})

    }catch(error){
        next(error)
    }
}

exports.followUser = async (req, res, next) => {

    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const user = await User.findById(req.params.userId)

        if(!user){
            const error = new Error("User not found.")
            error.statusCode = 404
            throw error
        }

        if(user._id.toString() == req.userId.toString()){
            const error = new Error("A user can't follow themselves.")
            error.statusCode = 403
            throw error
        }

        const userAuth = await User.findById(req.userId)

        if(userAuth.following.includes(user._id.toString())){
            const error = new Error("User authenticated already follows this user.")
            error.statusCode = 403
            throw error
        }

        user.followers.push(req.userId)
        userAuth.following.push(user._id)
                
        await userAuth.save({session})
        await user.save({session})

        await session.commitTransaction()
        await session.endSession()
        res.status(200).json({message: `User _id:${req.userId} is now following user _id:${user._id}.`})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }

}

exports.unfollowUser = async (req, res, next) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try{
        const user = await User.findById(req.params.userId)

        if(!user){
            const error = new Error("User not found.")
            error.statusCode = 404
            throw error
        }

        if(user._id.toString() == req.userId.toString()){
            const error = new Error("User authenticad and userId cannot be equal.")
            error.statusCode = 403
            throw error
        }

        const userAuth = await User.findById(req.userId)

        if(!userAuth.following.includes(user._id.toString())){
            const error = new Error("User authenticated does not follows this user.")
            error.statusCode = 403
            throw error
        }

        user.followers.pull(req.userId)
        userAuth.following.pull(user._id)
                
        await userAuth.save({session})
        await user.save({session})

        await session.commitTransaction()
        await session.endSession()
        res.status(200).json({message: `User _id:${req.userId} is now NOT following user _id:${user._id}.`})

    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }

}

exports.getUserInterests = async (req, res, next) => {

    const {
        search = "",
        interests = null,
        minDate = new Date(0),
        maxDate = Date.now(),
    } = req.query

    const interestsArray = interests ? interests.split(",") : null

    const filter = {
        ...(search ? {"username": RegExp(search, "i")} : {}),
        "createdAt": {$gte: new Date(minDate), $lte: new Date(maxDate)},
        ...(interests ? {"interests": {$in: interestsArray}} : {})
    }

    try {
        const interestsNumber = await User.aggregate([
            {
                $match: filter
            },
            {
                $unwind: "$interests"
            },
            {
                $group: {
                    _id: "$interests",
                    count: {$sum: 1}
                }
            },
            {
                $sort: { count: -1 }
            }
        ])

        res.status(200).json({
            interests: interestsNumber
                .map(interest => ({interest: interest._id, count: interest.count}))
                .filter(interest => interest.interest !== "") 
        })
    }catch(error){
        next(error)
    }
}

function deleteImage(imagePath){
    const filePath = path.join(__dirname, "..", imagePath)
    fs.unlink(filePath, err => {if(err){console.log("Fail to delete the review's images.")}})
}
