const { DeleteObjectsCommand } = require("@aws-sdk/client-s3")
const { s3 } = require("../util/s3")

const { INTERESTS_LIST } = require("./constants")

exports.getCategoryId = (interestName) => {
    const [id, _] = INTERESTS_LIST.find(([_, name]) => name === interestName)
    return (id)
}

exports.getCategoryName = (interestId) => {
    const [_, name] = INTERESTS_LIST.find(([id, _]) => id === interestId)
    return (name)
}

exports.deleteImagesOnS3 = async (keys = []) => {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Delete: {
            Objects: keys.map(key => ({Key: key})),
            Quiet: false
        }
    }

    try{

        await s3.send(new DeleteObjectsCommand(params))

    }catch(error){
        error.status = 500
        error.message = "Error while deleting the images!"
        throw(error)
    }

}