//promies way
const asyncHendler = (requestHendler)=>{
    (req, res , next)=>{
        Promise.resolve(()=>{
            requestHendler(req,res,next);
        }).catch((error)=>{
            next(error);
        })
    }
};

// const asyncHendler = (func) => {
//    async () => {    

//     }
// }

//same as 
/*
try and catch way
const asyncHendler = (func) => async (req , res , next) => {
    try {
        await func(req,res,next);
    } catch (error) {
        console.error("ERROR :", error);
        Log.error(`\n ->>> ERRO in asyncHendler <<<- \n`);
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        });
        process.exit();
    }
};
*/
export { asyncHendler };