const express=require('express');
const router=express.Router();
const {UserCretaed,updateScore}=require('../Controller/user');


router.post('/createUser',UserCretaed);
router.put('/updateScore',updateScore);


module.exports=router;