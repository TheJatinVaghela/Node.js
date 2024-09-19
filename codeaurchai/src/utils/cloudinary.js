import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY ,  
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if (!localFilePath) return null ;

        //upload the file on cloudinary 
       const responce = await cloudinary.uploader.upload(localFilePath, 
            {
                resource_type:"auto"
            }
        )

        //file has been uploaded 
        console.log("file is uploaded on cloudinary", responce.url);

        return responce;
        
    } catch (error) {
        //remove the localy saved temp file as the upload opration got failed 
        fs.unlinkSync(localFilePath);
        console.error("There has been error on file upload");
        
        return null;
    }
}