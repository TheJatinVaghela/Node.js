import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { DB_NAME } from './constants.js';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path:"./env"
});
connectDB()
.then((res)=>{
    app.on("error",(e)=>{
        console.log("ERROR: ",e);
        throw new Error("ERROR :", error); 
    });
    app.listen(process.env.PORT || 7878);
    console.log(`App is Listening on port ${process.env.PORT}`);
})
.catch((err)=>{
    console.error(`Mongo DB Connection Failed : ${err}`);
    throw new Error(`Mongo DB Connection Failed : ${err}`); 
});
/*
import express from 'express'
const app = express()
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(e)=>{
            console.log("ERROR: ",e);
            throw new Error("ERROR :", error); 
        });
        app.listen(process.env.PORT,(e)=>{
            console.log(`App is Listening on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("ERROR :" ,error);
        throw new Error("ERROR :", error);
    }
})()
*/