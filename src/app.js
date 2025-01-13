import cookieParser from "cookie-parser"
import express from "express"
import cors from "cors"


const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN, 
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true , limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes import

import userRouter from './routes/user.routes.js';
import courseRoute from './routes/course.route.js';


app.use("/api/v1/users" , userRouter)

app.use("/api/v1/courses" , courseRoute)




export { app } 