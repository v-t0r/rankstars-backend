const router = require("express").Router()
const { body } = require("express-validator")

const authController = require("../controllers/auth")
const User = require("../models/user")

router.post("/signup", [
    body("username").trim().custom(async (value, {req}) => {
        const user = await User.findOne({username: value})
        if(user){
            return Promise.reject("Username already in use.")
        }
    }),

    body("email").trim().isEmail().withMessage("Invalid email.")
        .custom(async (value, {req}) => {
            const user = await User.findOne({email: value})
            if(user){
                return Promise.reject("Email address already exists!")
            }
        }).normalizeEmail(),

    body("password", "Invalid password.").trim().isLength({min: 3}), //montar os requisitos do passwrod depois

], authController.signupUser)

router.post("/login", authController.loginUser)

router.post("/logout", authController.logoutUser)



module.exports = router