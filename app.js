
/**
 * Module dependencies: node, express, ejs, redis, connect-redis, node-oauth
 */

var express = require('express'),
	sys 	= require('sys'),
	url		= require('url'),
	oauth	= require(__dirname + '/node-oauth/lib/oauth').OAuth;

// Redis database configuration
if (process.env.REDISTOGO_URL) {  //for heroku redisToGo
	var rtg   = url.parse(process.env.REDISTOGO_URL);
	var redis = require("redis");
	var client = redis.createClient(rtg.port, rtg.hostname);
	
	//console.log(rtg.auth.split(":")[1]);
	redis.auth(rtg.auth.split(":")[1]);
} else {
	var redis = require("redis");
	var client = redis.createClient();
}

var RedisStore = require('connect-redis')(express);

client.on("error", function(err){
	console.log("Error " + err);
});

//Google config
var googleoa = new oauth("https://www.google.com/accounts/OAuthGetRequestToken",
             "https://www.google.com/accounts/OAuthAuthorizeToken", 
             "optimize.heroku.com",  "rJjoyI8mcoZqxpTGRXkiRn4U", 
             "1.0", null, "HMAC-SHA1");       

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
	res.render('index', {
		title: "Optimize"
	});
});

app.get('/getGoogleRequestToken', function(req, res) {
	getGoogleRequestToken(req, res);
});

app.get('/googleAuthSuccess', function(req, res) {
  if(typeof(url.parse(req.url).query) !== 'undefined') {
    var qs = url.parse(req.url, true).query.token;
  }

	client.set(req.sessionID + ':google:verifier', qs, function(err, reply){
	  exchangeGoogleToken(req, res);
	
	  // var to = setTimeout(function () {
	  //   res.writeHead(302, {
	  //     'Location': '/'
	  //   });
	  //   res.end();
	  // 	
	  // }, 3000);
	
	});
});


var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log("Listening on " + port);
});


var getGoogleRequestToken = function(req, res) {
	googleoa.getOAuthRequestToken({"scope":"http://www.google.com/calendar/feeds"}, function(error, oauth_token, oauth_token_secret, oauth_callback_confirmed, results) {
		if (error) {
			res.send('error: ' + JSON.stringify(error));
		} else {
			res.redirect('https://www.google.com/accounts/OAuthAuthorizeToken?oauth_token=' + oauth_token);
			
			sys.puts('oauth_token: ' + oauth_token);
			client.set(req.sessionID + ':google:requestToken', oauth_token, redis.print);
			sys.puts('oauth_token_secret: ' + oauth_token_secret);
			client.set(req.sessionID + ':google:requestTokenSecret', oauth_token_secret, redis.print);
			sys.puts("Requesting access token...");
		}
	});
};

var exchangeGoogleToken = function(req, res) {
	client.mget(req.sessionID + ':google:requestToken', 
				req.sessionID + ':google:requestTokenSecret', 
				req.sessionID + ':google:verifier', 
		function(err, replies) {
			console.log(replies[0]);
			console.log(replies[1]);
			console.log(replies[2]);
			googleoa.getOAuthAccessToken(replies[0], replies[1], replies[2], function(error, oauth_access_token, oauth_access_token_secret, results) {
		if (error) {
			sys.puts('error: ' + sys.inspect(error));
		} else {            
			res.send(results);
          // client.set(req.sessionID+':twitter:username', results2.screen_name, redis.print);
          // client.set(req.sessionID+':twitter:accessToken', oauth_access_token, redis.print);
          // client.set(req.sessionID+':twitter:accessTokenSecret', oauth_access_token_secret, redis.print);
		}
		});
    });
};

