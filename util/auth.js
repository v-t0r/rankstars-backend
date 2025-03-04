const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {
    const token = req.cookies.token

    if(!token){
        const error = new Error("Not authenticated.")
        error.statusCode = 401
        
        return next(error)
    }

    let decodedToken
    try{
        decodedToken = jwt.verify(token, `${process.env.JSON_WEB_TOKEN_PRIVATE_KEY}`)
    }catch(error){
        error.statusCode = 500
        return next(error)
    }

    //token falsificado ou vencido
    if(!decodedToken){
        const error = new Error("Not authenticated.")
        error.statusCode = 401
        return next(error)
    }

    req.userId = decodedToken.userId
    next()
}