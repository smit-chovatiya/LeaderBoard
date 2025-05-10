const mongoose=require('mongoose');


// schema
const userSchema=new mongoose.Schema({
    name:{
        type:String
    },
    score:{
        type:Number,
        default:0
    },
    EndDate:{
        type:Date,
        default:Date.now()
    },
    Rank:{
        type:Number
    }
    ,
    isRobot:{
        type:Number
    },
    LeaderBoardID:{
        type:String
    }
},{timestamps:true});


// Model
const User=mongoose.model('User',userSchema);

module.exports=User;