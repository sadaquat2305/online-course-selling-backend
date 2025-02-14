import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            lowercase: true,
            trim: true, 
            
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true, 
        },
         password: {
            type: String,
            required: [true, 'Password is required']
        },
        role: {
            type : String,
            enum : ['admin' , 'instructor' , 'student' ],
            required : true
        },
        bio : {
            type : String
        },
        profilePicUrl : {
            type : String
        },
        refreshToken: {
            type: String
        },

        purchasedCourses: [
            {
              courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },

              purchaseDate: { type: Date, default: Date.now },
              
              expiryDate: { type: Date, required: true }, // Subscription expiry date
            }
          ],

    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)