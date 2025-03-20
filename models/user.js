const { Schema, model, startSession }  = require("mongoose")

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    interests: [{ 
        type: String,
        default: [] 
    }],
    followers: [{
        type: Schema.Types.ObjectId,
        ref: "User",
        default: []
    }],
    following: [{
        type: Schema.Types.ObjectId,
        ref: "User",
        default: []
    }],
    followingLists: [{
        type: Schema.Types.ObjectId,
        ref: "List",
        default: []
    }],
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review",
        default: []
    }],
    likedReviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review",
        default: []
    }],
    lists: [{
        type: Schema.Types.ObjectId,
        ref: "List",
        default: []
    }],
    profilePicUrl: {
        type: String,
        default: "images/default-profile-pic.jpg"
    },
    status: {
        type: String,
        default: "Hello! I'm using RankStars now!"
    },
}, {timestamps: true})

userSchema.pre("findOneAndDelete", async function (next){
    const Review = require("./review")
    const List = require("./list")

    const userId = this.getQuery()._id

    try{
        const user = await User.findById(userId)
        if(!user){
            const error = new Error("User not found!")
            error.statusCode = 404
            throw error
        }
     
        for(const followerId of user.followers){
            const follower = await User.findById(followerId)
            follower.following.pull(user._id)
            await follower.save()
        }

        for(const followingId of user.following){
            const following = await User.findById(followingId)
            following.followers.pull(user._id)
            await following.save()
        }

        for(const likedReviewId of user.likedReviews){
            const likedReview = await Review.findById(likedReviewId)
            likedReview.likes.pull(userId)
            likedReview.totalLikes -= 1
            await likedReview.save()
        }

        for(const followedListId of user.followingLists){
            const followedList = await List.findById(followedListId)
            followedList.followers.pull(user._id)
            await followedList.save()
        }

        for(const reviewId of user.reviews){
            await Review.findByIdAndDelete(reviewId)
        }

        for(const listId of user.lists){
            await List.findByIdAndDelete(listId)
        }

        const comments = await Comment.find({"author": user._id})
        for(const comment of comments){
            await Comment.findByIdAndDelete(comment._id)
        }

        next()
    }catch(error){
        next(error)
    }    
})

const User = model("User", userSchema)
module.exports = User
