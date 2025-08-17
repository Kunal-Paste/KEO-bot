const mongoose = require('mongoose');

const connectDB = () => {
    mongoose.connect(process.env.MONGO_LINK)
    .then(()=>{
        console.log('connected to DB');
    })
    .catch((err)=>{
        console.log('failed to connect DB',err)
    })
}

module.exports = connectDB;