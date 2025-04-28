const {Schema, model, startSession} = require("mongoose")
const {INTEREST_LIST_IDS} = require("../util/constants")

const reviewSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId, 
        ref: "User",
        required: true 
    },
    type: {
        type: String,
        enum: INTEREST_LIST_IDS,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    review: {
        type: String,
        default: ""
    },
    likes: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: "User",    
        }],
        default: []
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    comments: {
        type: [{
        type: Schema.Types.ObjectId,
        ref: "Comment",
        }],
        default: []
    },
    lists: {
        type: [{
        type: Schema.Types.ObjectId,
        ref: "List",
        }],
        default: []
    },
    imagesUrls: {
        type: [{
        type: String,
        }], 
        default: ["images/default-review-pic.jpg"]
    }
}, {timestamps: true})

reviewSchema.pre("findOneAndDelete", async function (next){

    const User = require("./user")
    const List = require("./list")

    const reviewId = this.getQuery()._id

    const session = await startSession()
    session.startTransaction()

    try{
        const review = await Review.findById(reviewId)

        if(!review){
            const error = new Error("Review not found!")
            error.statusCode = 404
            throw error
        }

        const author = await User.findById(review.author)
        author.reviews.pull(reviewId)
        await author.save({session})

        //remove the like references from the users that liked the review
        const userLikeIds = review.likes
        for (const userLikeId of userLikeIds){
            const userLike = await User.findById(userLikeId)
            userLike.likedReviews.pull(reviewId)
            await userLike.save({session})
        }

        const listIds = review.lists
        for (const listId of listIds) {
            const list = await List.findById(listId)
            list.reviews.pull(reviewId)
            await list.save({session})
        }

        const commentIds = review.comments

        for (const commentId of commentIds) {
            await Comment.findByIdAndDelete(commentId)
        }

        await session.commitTransaction()
        await session.endSession()

        next()

    }catch(error){
        await session.abortTransaction()
        await session.endSession()

        next(error)
    }
})

const Review = model("Review", reviewSchema)
module.exports = Review
