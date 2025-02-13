// import mongoose, {Schema} from "mongoose";
// import jwt from "jsonwebtoken"
// import bcrypt from "bcrypt"

// const teacherSchema = new Schema(
//     {
//         userName: {
//             type: String,
//             required: true,
//             unique: true,
//             lowecase: true,
//             trim: true, 
//         },
//          password: {
//             type: String,
//             required: [true, 'Password is required']
//         },
//         refreshToken: {
//             type: String
//         }


//     },
//     {
//         timestamps: true
//     }
// )

// // teacherSchema.pre("save", async function (next) {
// //     if(!this.isModified("password")) return next();

// //     this.password = await bcrypt.hash(this.password, 10)
// //     next()
// // })

// // teacherSchema.methods.isPasswordCorrect = async function(password){
// //     return await bcrypt.compare(password, this.password)
// // }

// teacherSchema.methods.generateAccessToken = function(){
//     return jwt.sign(
//         {
//             _id: this._id,
//             email: this.email,
//             fullName: this.fullName
//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         {
//             expiresIn: process.env.ACCESS_TOKEN_EXPIRY
//         }
//     )
// }

// teacherSchema.methods.generateRefreshToken = function(){
//     return jwt.sign(
//         {
//             _id: this._id,
            
//         },
//         process.env.REFRESH_TOKEN_SECRET,
//         {
//             expiresIn: process.env.REFRESH_TOKEN_EXPIRY
//         }
//     )
// }

// export const Teacher = mongoose.model("Teacher", teacherSchema)