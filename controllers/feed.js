const moongose = require("mongoose")

const User = require("../models/user")
const Review = require("../models/review")
const List = require("../models/list")

exports.getForYou = async(req, res, next) => {
    const userId = req.userId
    const {quantity = 15, offset = 0} = req.query

    try{
        const followingUsers = (await User.findById(userId)).following
        //colocar em uma promise all depois

        const recentReviews = await Review.find({author: {$in: followingUsers}})
            .populate({
                path: "author", 
                select: "_id username profilePicUrl"
            })
            .sort({
                createdAt: -1
            })
            .limit(quantity)
            .skip(offset)
            .lean()
        const recentLists = await List.find({author: {$in: followingUsers}})
            .populate({
                path: "author", 
                select: "_id username profilePicUrl"
            })
            .sort({
                createdAt: -1
            })
            .limit(quantity)
            .skip(offset)
            .lean()

        let recentPosts = [ ...recentReviews, ...recentLists ]
        recentPosts = recentPosts.sort((a, b) => a["createdAt"] - b["createdAt"]).slice(0, quantity)

        res.status(200).json({posts: recentPosts})
        
    }catch(error){
        if(!error.status){
            error.status = 500
        }

        next(error)
    }

}