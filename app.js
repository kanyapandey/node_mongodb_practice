const express = require ('express');
const app =  express();
const validate = require('express-validator');
const { check } = require('express-validator/check');
const bodyParser = require ("body-parser");
const cors = require ("cors");
const dbConfig = require ("./config/database");
const appConfig = require ("./config/application");
const mongoose = require ("mongoose");
//connecting to mongo db
mongoose.connect(dbConfig.database);

mongoose.connection.on('connected',() => {
    console.log("database connected "+ dbConfig.database);
});

mongoose.connection.on('error',(err) => {
    console.log("Error while connecting to db: "+err);
});

app.use(validate());
//body parser midleware
app.use(bodyParser.json());

// user module
// const users = require ('./controllers/users.js');
require('./routes')(app);
// app.use('/users',users);

//index route
app.get('/',(req,res)=>{
    res.status(200).send("HI this is home");
});

//start server
app.listen(appConfig.port,function(){
    console.log("Server is listening on port ::" + appConfig.port);
});


