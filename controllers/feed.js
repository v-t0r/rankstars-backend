const moongose = require("mongoose")

const User = require("../models/user")
const Review = require("../models/review")
const List = require("../models/list")

exports.getRecentPosts = async(req, res, next) => {
    const {limit = 15, olderThan = Date.now()} = req.query

    try{
        const recentReviews = await Review.find({
            createdAt: {$lt: olderThan}
        })
            .populate({
                path: "author", 
                select: "_id username profilePicUrl"
            })
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .lean()

        const recentLists = await List.find({
            "createdAt": {$lt: olderThan} 
        })
            .populate([
                {
                    path: "author", 
                    select: "_id username profilePicUrl"
                },
                {
                    path: "reviews",
                    select: "_id, imagesUrls"
                }
            ])
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .lean()
 
        const recentPosts = [ 
            ...recentReviews.map(review => ({...review, type: "review"})), 
            ...recentLists.map(list => ({...list, type: "list"})) 
        ].sort((a, b) => b["createdAt"] - a["createdAt"]).slice(0, limit)

        res.status(200).json({posts: recentPosts})
        
    }catch(error){
        if(!error.status){
            error.status = 500
        }

        next(error)
    }
}

exports.getForYou = async(req, res, next) => {
    const userId = req.userId
    const {limit = 15, olderThan = Date.now()} = req.query

    try{
        const userInterests = (await User.findById(userId)).interests
        //colocar em uma promise all depois

        const recentReviews = await Review.find({
            type: {$in: userInterests},
            createdAt: {$lt: olderThan}
        })
            .populate({
                path: "author", 
                select: "_id username profilePicUrl"
            })
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .lean()

        const recentLists = await List.find({
            categories: {$in: userInterests},
            createdAt: {$lt: olderThan}
        })
            .populate([
                {
                    path: "author", 
                    select: "_id username profilePicUrl"
                },
                {
                    path: "reviews",
                    select: "_id, imagesUrls"
                }
            ])
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .lean()
 
        const recentPosts = [ 
            ...recentReviews.map(review => ({...review, type: "review"})), 
            ...recentLists.map(list => ({...list, type: "list"})) 
        ].sort((a, b) => b["createdAt"] - a["createdAt"]).slice(0, limit)

        res.status(200).json({posts: recentPosts})
        
    }catch(error){
        if(!error.status){
            error.status = 500
        }

        next(error)
    }
}

exports.getFollowingFeed = async(req, res, next) => {
    const userId = req.userId
    const {limit = 15, olderThan = Date.now()} = req.query

    try{
        const followingUsers = (await User.findById(userId)).following
        //colocar em uma promise all depois

        const recentReviews = await Review.find({
            author: {$in: followingUsers},
            createdAt: {$lt: olderThan}
        })
            .populate({
                path: "author", 
                select: "_id username profilePicUrl"
            })
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .lean()
        const recentLists = await List.find({
            author: {$in: followingUsers},
            createdAt: {$lt: olderThan}
        })
            .populate([
                {
                    path: "author", 
                    select: "_id username profilePicUrl"
                },
                {
                    path: "reviews",
                    select: "_id, imagesUrls"
                }
            ])
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .lean()
 
        const recentPosts = [ 
            ...recentReviews.map(review => ({...review, type: "review"})), 
            ...recentLists.map(list => ({...list, type: "list"})) 
        ].sort((a, b) => b["createdAt"] - a["createdAt"]).slice(0, limit)

        res.status(200).json({posts: recentPosts})
        
    }catch(error){
        if(!error.status){
            error.status = 500
        }

        next(error)
    }
}