const express = require('express');
const router = express.Router();
const User = require('../models/users');
const jwt = require('jsonwebtoken');
const config = require('../../../config/database');
var bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

router.post('/register', (req, res, next) => {

    console.log(req.body);
    req.checkBody('name').notEmpty().withMessage('Name is required').matches(/^[A-Za-z]+$/,"i").withMessage('Name must be only alphabets');
    req.checkBody('email').notEmpty().withMessage('Email is required').matches(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,"g").withMessage('must be only valid email');
    req.checkBody('mobile').notEmpty().withMessage('Mobile is required').isInt('Mobile is not valid').isLength({ max: 10 }).withMessage('must be at least 10 chars long');;
    req.checkBody('username').notEmpty().withMessage('Username is required').matches(/^[A-Za-z0-9_.-]*$/,"i").withMessage('must be only alpha numeric and underscore or dash');
    req.checkBody('password').notEmpty().withMessage('Password is required').isLength({ min: 5 }).withMessage('must be at least 5 chars long');

    req.getValidationResult().then(result => {
        let err = result.array({onlyFirstError: true})
        if (!result.isEmpty() ){
            let error = err[0].msg;
            res.json ({success: false, msg: error})
        } else {
            if(req.body.password != req.body.confirmpassword){
                res.json({success:false, msg: 'Password does not match'});
            }
            else{
                let quary = {$or:[{username:req.body.username},{mobile:req.body.mobile},{email:req.body.email}]}
                User.findOne(quary, (err, user) => {
                    if (err) {
                        return res.json({success:false, msg: error});
                    }
                    if(user) {
                        return res.json({success:false, msg: 'User already exist'});
                    }
                    
                    let newUser = new User({
                        name: req.body.name,
                        username: req.body.username,
                        mobile: req.body.mobile,
                        email: req.body.email,
                        password: req.body.password
                    });
                    console.log(req.body.password);
                    bcrypt.hash(req.body.password, 10, function(err, hash) {
                        if (err) { throw (err); }
                        bcrypt.compare(req.body.password, hash, function(err, result) {
                            if (err) { throw (err); }
                            newUser.password = hash;
                            newUser.save().then(success => {
                                return res.json({success: true, msg: 'user registered'});
                            });
                        });
                    });
                });
            }
        }
    });     
});

router.post('/authenticate', (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    User.getUserByUsername(username,(err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'User not found' });
        }
        console.log("user pass",user.password)
        bcrypt.compare(password, user.password, function(err, result) {
            if (err) { throw (err); }
            if (result) {
                if (err) throw err;
                const token = jwt.sign({user:user._id}, config.secret);
                console.log(token)
                if(err){
                    return res.json({ success: false, msg: 'User not found' });
                } else { 
                    return res.json({
                        success: true,
                        token: 'JWT ' + token,
                        user: {
                            name: user.name,
                            username: user.username,
                            mobile: user.mobile,
                            email: user.email,
                        }
                    });
                }
            }
            else {
                return res.json({ success: false, msg: 'Wrong Password' });
            }

        });
        
    });
});

router.get('/logout', (req, res, next) => {
    if(!req.headers.authorization){
        return res.json({success: false, msg:'Please login first'});
    } else {
        req.logout();
        return res.json({success: true, msg:'Logout successfully'});
    }
});

router.get('/dashboard', (req, res, next) => {
    var token = req.headers.authorization;
    jwt.verify(token, config.secret, function(err, decoded) {
        console.log(decoded);
        User.findById(mongoose.Types.ObjectId(decoded.user),(err,user)=>{
            console.log(user._id != decoded.user);
            if(user._id != decoded.user){
                if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
            } else {
                return res.json({success: true, msg:'Welcome to Dashboard'});

            }
        }) 
      
      });
});

router.get('/summary', (req,res, next) => {
    const exclude = "-password -__v -_id";
    User.find({},exclude, function(e, coll) {
        User.find({},exclude).count(function (e, count) {
          console.log(count);
          console.log(coll);
          res.json({success:true, msg: count,coll});
        });
      });  
});

router.post('/forget', (req,res,next) =>{
    const email = req.body.email;
    User.findOne({email:email}, (err, data) =>{
        if(data){
            let randomNumber = Math.floor(Math.random()*100000);
            var smtpTransport = nodemailer.createTransport({
                service: 'gmail',
                host: 'smpt.gmail.com',
                port: 587,        
                secure: false, // true for 465, false for other ports
                auth: {
                    user: 'kanja.26p@gmail.com',
                    pass: 'Kp26031995' 
                }
            });  
            let k = "http://localhost:1337/email-verification/"+randomNumber;
            var mailOptions = {
                to: req.body.email,
                subject: "Context Reset password email notification for verify your account",
                html: k
            }

            smtpTransport.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    return res.json({status: false, msg: "Mail Service is not availabe Please try after sme time"});
                    
                } 

            }); 
            
            data.random = randomNumber;
            data.save().then(success=> {
                return res.json({status: success, msg: "Successfully sent"});
            });
        } 
    });
   
});

router.post('/changePassword', (req,res,next) =>{
    const random = req.body.random;
    var newPassword = req.body.newPassword;
    var confirmPassword = req.body.confirmPassword;
    User.findOne({random:random}, (err, response) =>{
        if(response){
            res.json({status: true, msg: "Valid code"});
            bcrypt.hash(confirmPassword, 10, function(err, hash) {
                if (err) { throw (err); }
                bcrypt.compare(confirmPassword, hash, function(err, result) {
                    if (err) { throw (err); }
                    confirmPassword = hash;
                    response.password = confirmPassword;
                    response.save().then(success=> {
                        return res.json({status: success, msg: "Your new password has been successfully saved"});
                    });
                });
            });
        } else {
            return res.json({status: false, msg: "Not Valid"});
        }
    });
});

router.put('/update/:_id', (req,res,next) => {
    const name = req.body.name;
    const username = req.body.username;
    const mobile = req.body.mobile;
    const email = req.body.email;
    let query = {$set:{name:name,username:username,mobile:mobile,email:email}}
    User.findByIdAndUpdate(req.params._id, query, (err, response) =>{
        if(err){
            return res.json({status: false, msg: "Failed to update"});
        }else{
            return res.json({status: true, msg: "Successfully updated"});
        }
        
    });
});
module.exports = router; 