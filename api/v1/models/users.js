const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = mongoose.Schema({
    id:{
        type: String
    },
    name:{
        type: String
    },
    username:{
        type: String,
        required: true
    },
    random:{
        type: String
    },
    mobile:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    }
})

const User=module.exports = mongoose.model('User',UserSchema);

module.exports.getUserById = function(id,callback){
    User.findById(id,callback);
};

module.exports.getUserByUsername = function(username,callback){
    const query = {username:username}
    User.findOne(query,callback);
};

module.exports.getUserByEmail = function(email,callback){
    const query = {email:email}
    User.findOne(query,callback);
};

module.exports.checkRandom = function(random,callback){
    const query = {random:random}
    Forget.findOne(query,callback);  
 };
