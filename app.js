require("dotenv").config()
const path = require("path")
const fs = require("fs")

const express = require("express")
const https = require("https")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const mongoose = require("mongoose")
const multer = require("multer")

const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const reviewRoutes = require("./routes/reviewRoutes")
const listRoutes = require("./routes/listRoutes")
const commentRoutes = require("./routes/commentRoutes")

const app = express()

const privateKey = fs.readFileSync(process.env.HTTPS_PRIVATE_KEY, "utf8")
const certificate = fs.readFileSync(process.env.HTTPS_CERTIFICATE, "utf8")

const credentials = {key: privateKey, cert: certificate}

const server = https.createServer(credentials, app)

app.use("/images", express.static(path.join(__dirname, "images")))

// para corrigir error de cors
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL) 
    // res.setHeader("Access-Control-Allow-Origin", "*") //second argument can be a domain
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    next()
})

app.use(bodyParser.json())
app.use(cookieParser())

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images")
    },
    filename: (req, file, cb) => {
        cb(null, (new Date().toISOString() + "-" + file.originalname).replaceAll(":", "-"))
    }
})

const fileFilter = (req, file, cb) => {
    if(file.mimetype === "image/png" || 
        file.mimetype === "image/jpeg" || 
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/webp"
        ) {
        cb(null, true)
    }else{
        cb(null, false)
    }
}

app.use(multer({
    storage: fileStorage,
    fileFilter: fileFilter}).array("image", 10) //permite até 10 imagens
)

//minhas rotas
app.use(authRoutes)
app.use(userRoutes)
app.use(reviewRoutes)
app.use(listRoutes)
app.use(commentRoutes)

app.use((req, res, next) => {
    res.json("Hello, world!")
})

//rota padrão para erro
app.use((error, req, res, next) => {
    console.log(error)
    const status = error.statusCode || 500
    const message = error.message
    const data = error.data

    res.status(status).json({message, data})
})


mongoose.connect(`mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.teech.mongodb.net/${process.env.MONGODB_DATABASE_NAME}`)
    .then( () =>{
        server.listen(process.env.PORT || 3000)
    })
    .catch(err => console.log(err))