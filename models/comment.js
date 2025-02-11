const { Schema, model, startSession } = require("mongoose")

const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    where: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "whereModel"
    },
    whereType: {
        type: String,
        required: true,
        enum: ["Review", "List", "Comment"]
    },
    comments: [{
        type: Schema.Types.ObjectId,
        ref: "Comment",
        default: []
    }]
}, {timestamps: true})

commentSchema.pre("findOneAndDelete", async function (next){
    const Review = require("./review")
    const List = require("./list")
    
    const commentId = this.getQuery()._id

    const session = await startSession()
    session.startTransaction()

    try{
        const comment = await Comment.findById(commentId)

        if(!comment){
            const error = new Error("Comment not found!")
            error.statusCode = 404
            throw error
        }

        //The Id and Type of where the comment is
        const whereId = comment.where
        const whereType = comment.whereType

        let where
        if(whereType == "Review"){
            where = await Review.findById(whereId)
        }else if(whereType == "List"){
            where = await List.findById(whereId)
        }else if(whereType == "Comment"){
            where = await Comment.findById(whereId)
        }

        for (const childCommentId of comment.comments){
            await Comment.findByIdAndDelete(childCommentId, {session})
        }

        where.comments.pull(commentId)
        await where.save({session})

        await session.commitTransaction()
        await session.endSession()
        next()
    }catch(error){
        await session.abortTransaction()
        await session.endSession()
        next(error)
    }

})

Comment = model("Comment", commentSchema)
module.exports = Comment
