var express = require('express');

var router = express.Router();
module.exports = router;

router.use('/users', require('./controllers/users'));

