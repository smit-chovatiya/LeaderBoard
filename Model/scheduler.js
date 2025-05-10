const mongoose=require('mongoose');


const SchedulerSchema=new mongoose.Schema({
    JobID:{
        type:String
    },
    LeaderBoardID:{
        type:String
    },
    StartDate:{
        type:Date

    },
    EndDate:{
        type:Date
    }
},{timestamps:true});

const Scheduler=mongoose.model('Scheduler',SchedulerSchema);

module.exports={Scheduler};
