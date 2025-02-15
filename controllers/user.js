const mongoose = require("mongoose")

const User = require("../models/user")

exports.getUsers = async (req, res, next) => {
    const compact = req.query.compact
    
    fields = [
        "_id", 
        "username", 
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

    if(compact === "true"){
        fields = [
            "_id", 
            "username", 
        ]
    }

    try{
    const users = await User.find({}, fields)
    res.status(200).json({users})
    }catch(error){
        next(error)
    }
}

exports.getUser = async (req, res, next) => {
    const userId = req.params.userId
    try{
        const user = await User.findById(userId, [
            "_id", 
            "username", 
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
        ]).populate([{
                path: "followers",
                select: "_id username profilePicUrl status"
            },
            {
                path: "following",
                select: "_id username profilePicUrl status"
            }
        ]

        )
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
    const {sortBy = "createdAt", order = "-1"} = req.query

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

        const user = await User.findById(userId, ["reviews"]).populate({ 
            path: "reviews",
            options: { sort: {[sortBy]: +order}},
            populate: {
                path: "author",
                select: "_id username"
            }
        })

        if(!user){
            const error = new Error("User not found!")
            error.statusCode = 500
            throw error
        }

        res.status(200).json({reviews: user.reviews})

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

    try{
        const user = await User.findById(userId, ["lists"]).populate({
            path: "lists",
            options: { sort: {updatedAt: -1}},
            populate: [
                {
                    path: "reviews",
                    populate: {
                        path: "author",
                        select: "_id username"
                    }
                },
                {
                    path: "author",
                    select: "_id username"
                }
            ]
        })

        if(!user){
            const error = new Error("User not found!")
            error.statusCode = 500
            throw error
        }

        res.status(200).json({lists: user.lists})

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
