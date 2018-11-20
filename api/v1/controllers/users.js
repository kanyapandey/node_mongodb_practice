const express = require('express');
const router = express.Router();
const User = require('../models/users');
const jwt = require('jsonwebtoken');
const config = require('../../../config/database');
var bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const passport = require('passport')

router.post('/register', (req, res, next) => {
    req.checkBody('name').notEmpty().withMessage('Name is required').matches(/^[A-Za-z]+$/,"i").withMessage('Name must be only alphabets');
    req.checkBody('email').notEmpty().withMessage('Email is required').matches(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,"g").withMessage('must be only valid email');
    req.checkBody('mobile').notEmpty().withMessage('Mobile is required').isInt('Mobile is not valid').isLength({ max: 10 }).withMessage('must be at least 10 chars long');;
    req.checkBody('username').notEmpty().withMessage('Username is required').matches(/^[A-Za-z0-9_.-]*$/,"i").withMessage('must be only alpha numeric and underscore or dash');
    req.checkBody('password').notEmpty().withMessage('Password is required').isLength({ min: 5 }).withMessage('must be at least 5 chars long');

    req.getValidationResult().then(result => {
        let err = result.array({onlyFirstError: true})
        if (!result.isEmpty() ){ let error = err[0].msg; res.json ({success: false, msg: error})} 
        else {
            if(req.body.password != req.body.confirmpassword){res.json({success:false, msg: 'Password does not match'});}
            else{
                let quary = {$or:[{username:req.body.username},{mobile:req.body.mobile},{email:req.body.email}]}
                User.findOne(quary, (err, user) => {
                    if (err) {return res.json({success:false, msg: error});}
                    if(user) {return res.json({success:false, msg: 'User already exist'});}
                    else{                   
                        let newUser = new User({
                            name: req.body.name,
                            username: req.body.username,
                            mobile: req.body.mobile,
                            email: req.body.email,
                            password: req.body.password,
                            token: '',
                            activeVerify: "false"
                        });
                        bcrypt.hash(req.body.password, 10, function(err, hash) {
                            if (err) { throw (err); }
                            bcrypt.compare(req.body.password, hash, function(err, result) {
                                if (err) { throw (err); }
                                newUser.password = hash;
                                newUser.save().then(success => {
                                    res.json({success: true, msg: 'user registered'});
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
                                    const token = jwt.sign({user:success._id}, config.secret);
                                    let k = "http://localhost:1337/activation-link/"+token;
                                    var mailOptions = {
                                        to: req.body.email,
                                        subject: "Click your activation link",
                                        html: k
                                    }
                                    
                                    newUser.token = token;
                                    newUser.save();
                                    smtpTransport.sendMail(mailOptions, function (error, response) {
                                        if (error) {return res.json({status: false, msg: "Mail Service is not availabe Please try after sme time"});}
            
                                    }); 
                                });
                            });
                        });
                    }
                });
            }
        }
    });     
});

router.post('/authenticate', (req, res, next) => {
    User.getUserByUsername(req.body.username,(err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'User not found' });
        }
        if(user.activeVerify == "false"){
            return res.json({success:false, msg: "Not activated yet"})
        }
        bcrypt.compare(req.body.password, user.password, function(err, result) {
            if (err) { throw (err); }
            if (result) {
                if (err) throw err;
                if(err){ return res.json({ success: false, msg: 'User not found' });} 
                else { return res.json({success: true,user: {name: user.name,username: user.username,mobile: user.mobile,email: user.email}});}
            }
            else { return res.json({ success: false, msg: 'Wrong Password' });}
        });
        
    });  
});

router.get('/logout', (req, res, next) => {
    User.findOne({token: req.headers.authorization},(err, user) => {
        if(!user){
            return res.json({success:false, msg: "Please login first"})
        }else{
            req.logout();
            return res.json({success:true, msg: "Logout successfully"})
        }
    });
});

router.get('/dashboard', (req, res, next) => {
    User.findOne({token: req.headers.authorization},(err, user) => {
        if(user){
            return res.json({success:true, msg: "Welcome to Dashboard"})
        }else{
            return res.json({success:false, msg: "Failed in authorization"})
        }
    });
});

router.get('/summary', (req,res, next) => {
    const exclude = "-password -__v -_id";
    User.find({},exclude, function(e, coll) {
        User.find({},exclude).count(function (e, count) {
          res.json({success:true, msg: count,coll});
        });
      });  
});

router.post('/forget', (req,res,next) =>{
    User.findOne({email:req.body.email}, (err, data) =>{
        if(data){
            let token = data.token;
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
            let k = "http://localhost:1337/email-verification/"+token;
            var mailOptions = {
                to: req.body.email,
                subject: "Context Reset password email notification for verify your account",
                html: k
            }

            smtpTransport.sendMail(mailOptions, function (error, response) {
                if (error) { return res.json({status: false, msg: "Mail Service is not availabe Please try after sme time"});} 
                else { return res.json({status: true, msg: "Check your mail"});}
            }); 
        } else {return res.json({status: false, msg: "No data"});}
    });
   
});

router.post('/changePassword/:token', (req,res,next) =>{
    User.findOne({token:req.params.token}, (err, response) =>{
        if(response){
            res.json({status: true, msg: "Valid code"});
            bcrypt.hash(req.body.confirmPassword, 10, function(err, hash) {
                if (err) { throw (err); }
                bcrypt.compare(req.body.confirmPassword, hash, function(err, result) {
                    if (err) { throw (err); }
                    req.body.confirmPassword = hash;
                    response.password = req.body.confirmPassword;
                    response.save().then(success=> {
                        return res.json({status: success, msg: "Your new password has been successfully saved"});
                    });
                });
            });
        } else {
            res.json({status: false, msg: "Not Valid"});
        }
    });
});

router.put('/update/:_id', (req,res,next) => {
    let query = {$set:{name:req.body.name,username:req.body.username,mobile:req.body.mobile,email:req.body.email}}
    User.findOne({_id: req.params._id}, (err,user) => {
        if(user){
            User.findByIdAndUpdate(req.params._id, query, (err, response) =>{
                if(err) {return res.json({status: false, msg: "Failed to update"});}
                else {return res.json({status: true, msg: "Successfully updated"});}  
            });
        }else {
            return res.json({msg: "Incorrect User ID"});
        }

    });
   
});

router.get('/email-verification/:token', async(req,res,next) => {
    try {
        User.findOne({token: req.params.token}, (err,user) => {
            if (user){
                user.activeVerify = "true";
                user.save().then(success=> {
                    return res.json({msg: "Activated"});
                });
            }else {
                res.json({msg: "Token is not valid"});
            }
        })
      } catch (e) {
          res.json(e)
      }
});
module.exports = router; 