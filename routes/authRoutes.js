const router = require("express").Router()
const { body } = require("express-validator")

const authController = require("../controllers/auth")
const User = require("../models/user")


router.post("/users", [
    body("username").trim().custom(async (value, {req}) => {
        const user = await User.findOne({username: value})
        if(user){
            return Promise.reject("Username already in use.")
        }
    }),
    body("username", "Username can't be empty!").trim().notEmpty(),
    body("email").trim().isEmail().withMessage("Invalid email.")
        .custom(async (value, {req}) => {
            const user = await User.findOne({email: value})
            if(user){
                return Promise.reject("Email address already exists!")
            }
        }).normalizeEmail(),

    body("password").trim().custom(async (value, {req}) => {
        if(value.length < 8) return Promise.reject("Password must have at least 8 characters.")
        if( !(/[a-z]/.test(value)) ) return Promise.reject("Password must have at least one lowercase letter!")
        if( !(/[A-Z]/.test(value)) ) return Promise.reject("Password must have at least one uppercase letter!")
        if( !(/[0-9]/.test(value)) ) return Promise.reject("Password must have at least one number!")
    }),

], authController.signupUser)

router.post("/users/login", authController.loginUser)

router.get("/users/logout", authController.logoutUser)

router.get("/auth/status", authController.loginStatus)

module.exports = router