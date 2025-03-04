const mongoose = require("mongoose")
const { validationResult } = require("express-validator")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const User = require("../models/user")

exports.signupUser = async (req, res, next) => { //used to signup users
    const errors = validationResult(req)

    try{
        if(!errors.isEmpty()){
            const error = new Error("Validation error.")
            error.statusCode = 422
            error.data = errors.array()
            throw(error)
        }

        const username = req.body.username
        const email = req.body.email
        const password = await bcrypt.hash(req.body.password, 12)

        const user = new User({
            username,
            email,
            password,
        })

        const createdUser = await user.save()
        
        res.status(201).json({
            message: "User created!",
            userId: createdUser._id
    })

    }catch(error) {
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.loginUser = async (req, res, next) => { //used to login users
    const email = req.body.email 
    const password = req.body.password

    try{
        const user = await User.findOne({email})

        if(!user){
            const error = new Error("User not found!")
            error.statusCode = 401
            throw error
        }

        const isEqual = await bcrypt.compare(password, user.password)

        if(!isEqual){
            const error = new Error("Wrong password!")
            error.statusCode = 401
            throw error
        }

        const token = jwt.sign(
            {
                userId: user._id.toString()
            },
            `${process.env.JSON_WEB_TOKEN_PRIVATE_KEY}`,
            {expiresIn: "1h"}
        )

        res
            .status(200)
            .cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 60*60*1000 // dura 1 hora
            })
            .json({userId: user._id.toString()})

    }catch(error){
        if(!error.statusCode){
            error.statusCode = 500
        }
        next(error)
    }
}

exports.logoutUser = (req, res, next) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    })

    res.status(200).json({message: "User logged out."})
}

exports.loginStatus = (req, res, next) => {
    const token = req.cookies.token

    if(!token){
        return res.status(200).json({authenticated: false})
    }

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
    
    res.status(200).json({authenticated: true, userId: decodedToken.userId, expDate: decodedToken.exp * 1000})
}