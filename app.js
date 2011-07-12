/**
 * Module dependencies: node, express, ejs, redis, connect-redis, node-oauth
 */

var express = require('express'),
	sys 	= require('sys');

// Redis database configuration
if (process.env.REDISTOGO_URL) {  //for heroku redisToGo
	var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	var redis = require("redis").createClient(rtg.port, rtg.hostname);
	
	console.log(rtg.href);
	redis.auth(rtg.auth.split(":")[2]);
} else {
	var redis = require("redis").createClient();
}

var RedisStore = require('connect-redis')(express);

redis.on("error", function(err){
	console.log("Error " + err);
});
//Google config

//Facebook config

// Configuration
var app = module.exports = express.createServer();

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({ store: new RedisStore({maxAge: 86400000}), secret: 'myNightWillBeAwesome' }));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

// Environments
app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Serve Error
app.error(function(err, req, res, next){
	res.send('404 Not Found<br><br>'+err,404);
});

// Routes
app.get('/', function(req, res){
	if (req.session.visits) req.session.visits++;
	else req.session.visits = 1;
	
	res.render('index', {
		title: '' + req.session.visits
	});
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log("Listening on " + port);
});