const express=require('express');
const mongoose=require('mongoose');
const User=require('./Routes/user');
const job=require('./CronJob/job');
const app=express();


// DB connected
mongoose.connect('mongodb://127.0.0.1:27017/Leaderboard').then(()=>{console.log('DB are connected.....')});

app.use(express.json());
app.use('/api',User);


// server are created....
app.listen(2000,()=>{
    console.log('Server Are Running in PORT:2000');
})