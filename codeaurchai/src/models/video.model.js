import mongoose from 'mongoose'
import mongooseAggregatePaginateV2 from 'mongoose-aggregate-paginate-v2'
const videoSchema = new mongoose.Schema(
    {
        videoFile :{
            type: String, //cloudinary url
            required:[true , "videoFile is required"],
        },
        thumbnail:{
            type: String, //cloudinary url
            required:[true , "thumbnail is required"],
        },
        title:{
            type: String, 
            required:[true , "title is required"],
        },
        description:{
            type: String, 
            required:[true , "description is required"],
        },
        duration:{
            type: String, //cloudinary url
            required:[true , "duration is required"],
        },
        views:{
            type: Number, //cloudinary url
            default:0,
            required:[true , "duration is required"],
        },
        isPublished:{
            type:Boolean,
            default:true
        },
        owner:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required:[true , "owner is required"],
        }

    },
    {
        timestamps:true
    }
);

videoSchema.plugin(mongooseAggregatePaginateV2);

export const Video = mongoose.model("Video",videoSchema);