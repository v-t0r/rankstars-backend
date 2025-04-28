const { INTERESTS_LIST } = require("./constants")

exports.getCategoryId = (interestName) => {
    const [id, _] = INTERESTS_LIST.find(([_, name]) => name === interestName)
    return (id)
}

exports.getCategoryName = (interestId) => {
    const [_, name] = INTERESTS_LIST.find(([id, _]) => id === interestId)
    return (name)
}