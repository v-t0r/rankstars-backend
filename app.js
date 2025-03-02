require("dotenv").config()
const path = require("path")

const express = require("express")
const cors = require("cors")
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

app.use("/images", express.static(path.join(__dirname, "images")))

// para corrigir error de cors
app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
)

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
        app.listen(process.env.PORT || 3000)
    })
    .catch(err => console.log(err))