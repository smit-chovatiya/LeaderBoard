const mongoose=require('mongoose');

const LeaderboardSchema=new mongoose.Schema({
    UserInfo:[
        {
            _id:{type:String},
            name:{type:String},
            score:{type:Number},
            isRobot:{type:Number},
            Rank:{type:Number},
            isRewordCollect:{type:Boolean,default:false},
            Reword:{type:Number}
            
        }
    ],
    Status:{
        type:String,
        enum:['Active','Non-Active']
    },
    EndDate:{
        type:Date
    }
},{timestamps:true});


// model
const LeaderBoard=mongoose.model('LeaderBoard',LeaderboardSchema);

module.exports=LeaderBoard;