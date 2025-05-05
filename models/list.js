const { Schema, model, startSession } = require("mongoose")
const {INTEREST_LIST_IDS} = require("../util/constants")

const listSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    followers: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        default: []
    },
    reviews: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: "Review",
        }],
        default: []
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ""
    },
    comments: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: "Comment",
        }],
        default: []
    },
    categories: {
        type: [{
            type: String,
            enum: INTEREST_LIST_IDS
        }],
        default: []
    }
}, {timestamps: true})

/** This middleware hook makes sure that when a list is deleted, 
 * all references to it in users and reviews  is also deleted.
 */
 
listSchema.pre("findOneAndDelete", async function (next){
    
    const User = require("./user")
    const Review = require(("./review"))
    const Comment = require("./comment")

    const listId = this.getQuery()._id

    const session = await startSession()
    session.startTransaction()

    try{
        const list = await List.findById(listId)

        if(!list){
            const error = new Error("List not found!")
            error.statusCode = 404
            throw error
        }

        const authorId = list.author
        const followerIds = list.followers
        const reviewIds = list.reviews
        const commentIds = list.comments

        const author = await User.findById(authorId)
        author.lists.pull(listId)
        await author.save({session})

        for (const followerId of followerIds) {
            const follower = await User.findById(followerId)
            follower.followingLists.pull(listId)
            await follower.save({session})
        }

        for (const reviewId of reviewIds) {
            const review = await Review.findById(reviewId)
            review.lists.pull(listId)
            await review.save({session})
        }

        for (const commentId of commentIds) {
            await Comment.findByIdAndDelete(commentId)
        }

        await session.commitTransaction()
        await session.endSession()
        next()

    }catch(error){
        await session.abortTransaction()
        await session.endSession()

        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }

})

const List = model("List", listSchema)
module.exports = List