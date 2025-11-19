import mongoose from 'mongoose' ;
import colors from 'colors';

 
const connectDB = async () => { 
    try { 
        const conn = await mongoose.connect(process.env.DB_URI);
        console.log(`Connected to MongoDB Database ${conn}` .bgMagenta.white);
    } catch (error) { 
        console.log(`Error in MongoDB ${error}` .bgRed.white);


    }
};

export default connectDB;
