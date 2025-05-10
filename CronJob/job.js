const job=require('node-schedule');
const {createLeaderBoard}=require('../Controller/user');
const LeaderBoard = require('../Model/leaderBoard');
const User = require('../Model/user');


let job1;
// Start Tournamate
const nodeStartTournament = async (seconds) => {
    try {
        const CurrDate=new Date();
        const EndDate = new Date();
        EndDate.setSeconds(EndDate.getSeconds() + seconds);

        const LB=await LeaderBoard.find({Status:'Active'});
        if(LB){
            for(let lbs of LB){
                if(CurrDate>=lbs.EndDate){
                    await LeaderBoard.updateMany({_id:lbs._id},{
                        $set:{Status:'InActive'}
                    })
                    console.log('Data In Actived....');
                }
            }
       
        }
        await createLeaderBoard(EndDate);


        job1=job.scheduleJob(EndDate,async()=>{
           console.log('Cron Start:');
            const Ed= new Date();
            Ed.setSeconds(Ed.getSeconds() + seconds);
            if(CurrDate < EndDate){
                const Leaderboards=await LeaderBoard.find({Status:'Active'});
                if(!Leaderboards) console.log('A Leaderboard a Not Founded...');

                for(let Leaderboard of Leaderboards){
                    const data= await LeaderBoard.updateOne({_id:Leaderboard._id,Status:'Active'},{
                        $set:{Status:'InActive'}
                    },{new:true});

                
                    // Assign rewards
                    let Rewards = [5000, 4000, 3000];
                    Leaderboard.UserInfo.forEach((user,index)=>{
                        user.Reword=Rewards[index]
                    })

                    await LeaderBoard.updateOne({_id:Leaderboard._id},{
                        $set:{UserInfo:Leaderboard.UserInfo}
                    });
                 
                    await User.updateMany({LeaderBoardID:Leaderboard._id},{
                        $set:{LeaderBoardID:null}
                    },{new:true});
                }
            
            console.log('A LeaderBoard status has In Active...');
            console.log('A User In LeaderBoard Id has set to null...');
                }
                   

                // 1 Minute Delay after Run...
                let job2=job.scheduleJob('*/1 * * * *',()=>{
                    console.log('Deleay has start...');
                    // Recursion function call itself...
                   nodeStartTournament(60);
                   job2.cancel();

                })
            job1.cancel();
            console.log('Job Are Cancel...');
        })
        
    } catch (err) {
        console.log('Error:', err.message);
    }
};

// Example usage
// nodeStartTournament(60); // Adds 60 seconds to the current time



module.exports={
    nodeStartTournament
}