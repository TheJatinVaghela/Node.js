import mongoose, { Schema } from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'


const userSchema = new Schema(
    {
        username : {
            type: String,
            required:[true , "username is required"],
            unique:true,
            lowecase:true,
            trim:true,
            index:true
        },
        email : {
            type: String,
            required:[true , "email is required"],
            unique:true,
            lowecase:true,
            trim:true
        },
        fullname : {
            type: String,
            required:[true , "fullname is required"],
            trim:true,
            index:true
        },
        avatar :{
            type: String, //cloudinary url
            required:[true , "avatar is required"],
        },
        coverImage:{
            type:String, //cloudinary url
        },
        watchHostory:[
            {
                type: Schema.Types.ObjectId,
                res: "Video"
            }
        ],
        password:{
            type:String,
            required:[true , "Password is required"],
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
)
// do  not use arreow functions here 
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    
    this.password = bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.gernerateAccessToken = async function (){
    return await jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SCERET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.gernerateRefreshToken = async function () {
    return await jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User =  mongoose.model("User",userSchema);