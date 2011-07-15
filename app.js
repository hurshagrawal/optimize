/**
 * Module dependencies: node, express, ejs, redis, connect-redis, node-oauth
 */

var express 	= require('express'),
	sys 		= require('sys'),
	url			= require('url'),
	http		= require('http'),
	oauth		= require(__dirname + '/node-oauth/lib/oauth').OAuth,
	redis		= require("redis"),
	client		= redis.createClient(),
	RedisStore 	= require('connect-redis')(express);

var SERVERURL = "ec2-67-202-30-240.compute-1.amazonaws.com";
client.on("error", function(err){
	console.log("Error " + err);
});

// Google config
var googleoa = new oauth("https://www.google.com/accounts/OAuthGetRequestToken",
             "https://www.google.com/accounts/OAuthGetAccessToken", 
             SERVERURL,  "2UMRMh8WhzqwxCKpvZZ4F1Sp", 
             "1.0", null, "HMAC-SHA1");       

// Facebook config

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
		title: "Welcome"
	});
});

app.get('/getGoogleRequestToken', function(req, res) {
	getGoogleRequestToken(req, res);
});

app.get('/googleAuthSuccess', function(req, res) {
	if(typeof(url.parse(req.url).query) !== 'undefined') {
		var qs = url.parse(req.url, true).query.oauth_verifier;
	}
	
	client.set(req.sessionID + ':google:verifier', qs, redis.print);
	
	getGoogleAccessToken(req, res);
//	getGoogleCalendarList(req, res);
	
	res.render('events', {
		title: "Authorized with Google!"
	});
});


var port = process.env.PORT || 80;
app.listen(port, function(){
  console.log("Listening on " + port);
});


var getGoogleRequestToken = function(req, res) {
	googleoa.getOAuthRequestToken({"scope": "http://www.google.com/calendar/feeds",
		"oauth_callback": "http://"+SERVERURL+"/googleAuthSuccess"}, 
		function(error, oauth_token, oauth_token_secret, oauth_callback_confirmed, results) {
			if (error) {
				res.send('error: ' + JSON.stringify(error));
			} else {
				res.redirect('https://www.google.com/accounts/OAuthAuthorizeToken?oauth_token=' + oauth_token);
			
//				console.log('oauth_token: ' + oauth_token);
//				console.log('oauth_token_secret: ' + oauth_token_secret);
				client.set(req.sessionID + ':google:requestToken', oauth_token, redis.print);
				client.set(req.sessionID + ':google:requestTokenSecret', oauth_token_secret, redis.print);
				sys.puts("Requesting access token...");
			}
		});
};

var getGoogleAccessToken = function(req, res) {
	client.mget(req.sessionID + ':google:requestToken', 
				req.sessionID + ':google:requestTokenSecret', 
				req.sessionID + ':google:verifier', 
		function(err, replies) {
//			console.log(replies[0]); //request token
//			console.log(replies[1]); //request token secret
//			console.log(replies[2]); //verifier
			googleoa.getOAuthAccessToken(replies[0], replies[1], replies[2], function(error, oauth_access_token, oauth_access_token_secret, results) {
				if (error) {
					sys.puts('error: ' + sys.inspect(error));
				} else {            
//					console.log(oauth_access_token);
//					console.log(oauth_access_token_secret);
					client.set(req.sessionID+':google:accessToken', oauth_access_token, redis.print);
					client.set(req.sessionID+':google:accessTokenSecret', oauth_access_token_secret, redis.print);
					getGoogleCalendarList(req, res);
				}
			});
    	});
};

var getGoogleCalendarList = function(req, res) {
	client.mget(req.sessionID + ':google:accessToken', 
				req.sessionID + ':google:accessTokenSecret', 
		function(err, replies) {
//			console.log("access token: "+replies[0]); //access token
//			console.log("access token secret: "+replies[1]); //access token secret
			
			var requestURL = "https://www.google.com/calendar/feeds/default/allcalendars/full?alt=jsonc";
			// requestURL = googleoa.signUrl(requestURL, replies[0], replies[1], "GET");
			// 
			// console.log(url.parse(requestURL).host);
			// console.log(url.parse(requestURL).pathname + url.parse(requestURL).search);
			// 
			// var requestOptions = {
			//   host: url.parse(requestURL).host,
			//   port: 443,
			//   path: url.parse(requestURL).pathname + url.parse(requestURL).search
			// };
			// 
			// http.get(requestOptions, function(res) {
			//   console.log("Got response: " + res.statusCode);
			// }).on('error', function(e) {
			//   console.log("Got error: " + e.message);
			// });
			console.log("runs");
			var abc = googleoa.get(requestURL, replies[0], replies[1], function(error, data, results) {
				console.log("running2131232");
				if (error) {
					sys.puts('error: ' + sys.inspect(error));
				} else {
					console.log("ok, got here");
					console.log("data: "+data);
					console.log("results: "+results);
				}
			});
			
 	});
};

