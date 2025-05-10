const User = require('../Model/user');
const LeaderBoard = require('../Model/leaderBoard');
const mongoose = require('mongoose');
const { Scheduler } = require('../Model/scheduler');
const schedule = require('node-schedule');

// A User are cretaed...
const UserCretaed = async (req, res) => {
    try {
        if (req.body == null) return res.json({ Message: 'Please Fill The Proper Detials...' });
        const user = await User.create(req.body);
        res.status(201).json({ Status: 'Success', Message: 'A User Are Created...', UserInfo: user });
    }
    catch (err) {
        console.log('Error:', err.message);
        return res.status(500).json({ Message: 'Server Issue...' });
    }
}


// A LeaderBoard Are Created...
const createLeaderBoard = async (EndDate) => {
    try {
        const user = await User.find({ isRobot: 0, createdAt: { $gt: '2025-02-01T06:33:18.237+00:00' } });
        if (!user) return console.log('A LederBoard Can not Founded...');

        const leaderBoard = new LeaderBoard({
            UserInfo: user.map(user => user._doc),
            EndDate: EndDate,
            Status: 'Active'
        });

        await leaderBoard.save();

        console.log('LeaderBoard:', leaderBoard);
        await botMoveFunction(1,leaderBoard._id);
        await BotScoreFunction(leaderBoard._id);

    }
    catch (err) {
        console.log('Error:', err);
    }
}

// A Update Score
const updateScore = async (req, res) => {
    try {
        const { uid, score, isReword } = req.body;
        const UserID = new mongoose.Types.ObjectId(uid);
        const user = await User.findOne({ _id: UserID });
        if (!user) return res.status(404).json({ Message: 'A User Can Not Found...' });

        // 1st Flow for Rewords...
        if (uid && isReword == true) {

            // Update For Specific User:
            const LB = await LeaderBoard.find({ Status: 'InActive', 'UserInfo._id': UserID });
            if (!LB.length) {
                return res.status(404).json({ Message: 'No Inactive Leaderboards Found' });
            }

          
            // console.log('LBS:',LB);
            for (let lbs of LB) {
                // For Single User...
                console.log('LBS:',lbs);
                const Singleuser = await LeaderBoard.updateMany({ _id: lbs._id, 'UserInfo._id': UserID }, {
                    $set: { 'UserInfo.$.isRewordCollect': true }
                }, { new: true });

                // For All Bots:
                const AllBoats = await LeaderBoard.updateMany   ({ _id: lbs._id, 'UserInfo.isRobot': 1 }, {
                    $set: { 'UserInfo.$[element].isRewordCollect': true },

                }, { arrayFilters: [{ "element.isRobot": 1 }] });
               
                
            }
            return res.json({ Message: 'LeaderBoard Ended && Reword Collected...' });

           
        }


        // Find The Existing User...
        const ExistingUser = await LeaderBoard.findOne({ UserInfo: { $elemMatch: { _id: UserID, isRewordCollect: false } } });
        // console.log('Existing User:',ExistingUser);

        if (ExistingUser) {
            if (ExistingUser.Status === 'InActive') {
                return res.json({ Message: 'LeaderBoard Ended...', LeaderBoard: ExistingUser });
            }

            // Updated Score Logic::
            const updateScore = await LeaderBoard.findOneAndUpdate({ Status: 'Active', 'UserInfo._id': UserID },
                { $inc: { 'UserInfo.$.score': score } }
            )
            await ApplyRank(updateScore._id);
            // console.log('Score Are:',scoreData);



            const LB = await LeaderBoard.findOne({ Status: 'Active', 'UserInfo._id': UserID });

            // Top 5 Player's
            const TOp5Users = await LeaderBoard.findOne({_id:LB._id},{'UserInfo':{$slice:5}})
            // Previous LeaderBoard...
            const PrevLB=await LeaderBoard.findOne({Status:'InActive'},{'UserInfo':{$slice:5}}).sort({createdAt:-1});
            // console.log('Previous LeaderBOard::--',PrevLB);

            const currentUser = LB.UserInfo.find(user => user._id.toString() === UserID.toString());
            if (currentUser.Rank <= 5) {
                return res.json({ Message: 'UpDated Successfully....', CurrentLeaderBoard: TOp5Users,PreviousLeaderBoard:PrevLB});
            }
            else {
                TOp5Users.UserInfo.push(currentUser);
                return res.json({ Message: 'UpDated Successfully...', CurrentLeaderBoard: TOp5Users,PreviousLeaderBoard:PrevLB});
            }



            // console.log('UpDated Score:',updateScore);
        } else {
            const existingLeaderBoard = await LeaderBoard.findOne({ Status: 'Active' });
            console.log('Existing LeaderBoard:');
            if (existingLeaderBoard) {
                const PrevLB=await LeaderBoard.findOne({Status:'InActive'},{'UserInfo':{$slice:5}}).sort({createdAt:-1});
                if (existingLeaderBoard && existingLeaderBoard.UserInfo.length >= 50) {
                    const newLeaderBoard = new LeaderBoard({
                        UserInfo: [{
                            _id: user._id,
                            name: user.name,
                            score: score,
                            EndDate: user.EndDate
                        }],
                        Status: 'Active',
                        EndDate: existingLeaderBoard.EndDate
                    });
                    await newLeaderBoard.save();
                  
                    await ApplyRank(newLeaderBoard._id);
                    await BotScoreFunction(newLeaderBoard._id);
                    await botMoveFunction(1,newLeaderBoard._id);
                    const findData = await LeaderBoard.findOne({ _id: newLeaderBoard._id });
                    res.json({ Message: 'A New LeaderBoard created!!!', CurrentLeaderBoard: findData,previousLeaderBoard:PrevLB});
                } else {
                    const existingLBPush = await LeaderBoard.findOneAndUpdate(
                        { _id: existingLeaderBoard._id, Status: 'Active' },
                        {
                            $push: {
                                UserInfo: {
                                    _id: user._id,
                                    name: user.name,
                                    score: score,
                                    EndDate: user.EndDate
                                }
                            }
                        },
                        { new: true }
                    );

                    await ApplyRank(existingLBPush._id);
                    const findExistingPushData = await LeaderBoard.findOne({ Status: 'Active' });
                    res.json({ Message: 'A Existing LeaderBoard In User Added:', CurrentLeaderBoard: findExistingPushData,previousLeaderBoard:PrevLB});
                }
            }
        }
    }

    catch (err) {
        console.log('Error:', err);
        return res.status(500).json({ Status: 'False', Message: 'Server Issue...' });
    }
}

// Bot LeaderBoard craeated...
const botMoveFunction = async (count, LeaderBoardID) => {
    try {
        const RobotUser = await User.find({ isRobot: 1, LeaderBoardID: null });
        if (!RobotUser) console.log('No RobotUser Founded!!!');

        const LB = await LeaderBoard.findOne({ _id: LeaderBoardID, UserInfo: { $exists: true }, Status: 'Active' });
        if (!LB) console.log('No Active LeaderBoard Founded!!!');
        for (let i = 0; i < count; i++) {
            let selectedData;
            if (LB.UserInfo.LeaderBoardID == null) {
                const randomMove = Math.floor(Math.random() * RobotUser.length);
                selectedData = RobotUser[randomMove];
                console.log('Selected Data:', selectedData);
            }

            // Push The Randome data:
            if (!selectedData) console.log('Not Bot Move ....');
            else {
               if(LB.UserInfo!=null){
                LB.UserInfo.push(selectedData);
                await LB.save();
               }else{
                return console.log('Can not Null UserInfo....');
               }
            }
            const LBDatasave = LB.UserInfo.some(user => user._id.toString() === selectedData._id.toString());
            if (LBDatasave) {
                const DB = await User.updateMany({ _id: selectedData._id }, {
                    $set: { LeaderBoardID: LeaderBoardID }
                }, { new: true });
            }
        }
        await ApplyRank(LB._id);

        const delayseconds=20;
        const delayDate=new Date(Date.now()+delayseconds*1000);

        const jobid=Math.floor(Math.random()*1000);

        const scheduler=new Scheduler({
            JobID:jobid,
            LeaderBoardID:LeaderBoardID,
            StartDate:new Date(),
            EndDate:delayDate

        });

        await scheduler.save();


        schedule.scheduleJob(delayDate,async()=>{
            schedule.cancelJob(jobid);

            await Scheduler.deleteOne({JobID:jobid});

            await botMoveFunction(1,LeaderBoardID);
        })

    }
    catch (err) {
        console.log('Error:', err.message);
    }

}


// botSocre Updated 
const BotScoreFunction = async (LeaderBoardID) => {
    try {
        let seconds = 10;
        let scheduler=await Scheduler.findOne({LeaderBoardID:LeaderBoardID});
        const job1 = schedule.scheduleJob(`*/${seconds} * * * * *`, async() => {
            const LB = await LeaderBoard.findOne({ Status: 'Active', _id: LeaderBoardID });
            // console.log(LB);
            if (!LB) {
                 console.log('Not Active Leaderboard Founded....');
                 
                 if(new Date>scheduler.EndDate){
                    await Scheduler.deleteOne({LeaderBoardID:LeaderBoardID});
                    job1.cancel();
                    console.log('Update Score Job are cancel...');
                 }
                 return;
            }


            LB.UserInfo.forEach(async (user) => {
                if (user.isRobot == 1 && user.score <= 49) {
                    const randomScore = Math.floor(Math.random() * 10);
                    console.log('User Score:', user.score, 'User Name:', user.name);
                    user.score += randomScore;
                    // console.log(`User Name are:${user.name} and score are:${user.score}`);
                }

                if (user.score >= 50) {
                    user.score = 50;
                }

            })
          

            await LeaderBoard.updateOne({ _id: LB }, { $set: { UserInfo: LB.UserInfo } });


            console.log('A User Score are updated...');
            await ApplyRank(LB._id);
        })


    }
    catch (err) {
        console.log('Error:', err.message);
    }
}

// Apply Rnak'
const ApplyRank = async (LeaderBoardID) => {
    try {
        const lb = await LeaderBoard.findOne({ _id: LeaderBoardID, Status: 'Active' });

        // Sort users by score in descending order
        lb.UserInfo.sort((a, b) => b.score - a.score);

        // Assign ranks correctly
        lb.UserInfo.forEach((user, index) => {
            user.Rank = index + 1; // Set rank properly
        });
        // lb.markModified('UserInfo'); // Notify Mongoose of changes
        await lb.save();

        console.log('Rank Updated Successfully...');
    } catch (err) {
        console.error('Error:', err.message);
    }
};


module.exports = {
    UserCretaed,
    updateScore,
    createLeaderBoard
}