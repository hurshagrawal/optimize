/**
* Module dependencies: node, express, ejs, redis, connect-redis, node-oauth
*/

var express 	= require('express'),
sys				= require('sys'),
url				= require('url'),
http			= require('http'),
step			= require('step'),
oauth			= require(__dirname + '/node-oauth/lib/oauth').OAuth,
redis			= require("redis"),
client			= redis.createClient(),
RedisStore 		= require('connect-redis')(express);

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
		page: "splash"
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

	step(
		function authorizeWithGoogle() {
			getGoogleAccessToken(req, res, this);
		},
		function getGoogleCalendarData() {
			getGoogleCalendarList(req, res, this);
		},
		function returnToWebapp() {
			res.render('index', {
				page: "calendars"
			});
		}
	);

});

app.post('/googleEventFetch', function(req, res) {
	
	var chosenCals = req.body.calendar;
	
	fromDate = new Date();
	toDate = new Date();
	
	fromDate.setDate(parseInt(req.body.fromDay));
	fromDate.setMonth(parseInt(req.body.fromMonth));
	fromDate.setFullYear(parseInt(req.body.fromYear));
	fromDate.setHours(parseInt(req.body.fromHour));
	toDate.setDate(parseInt(req.body.toDay));
	toDate.setMonth(parseInt(req.body.toMonth));
	toDate.setFullYear(parseInt(req.body.toYear));
	toDate.setHours(parseInt(req.body.toHour));
	
	step(
		function getCalendarList() {
			client.mget(req.sessionID+':google:calendarList', this);
		},
		function getEventsFromParticularCalendars(err, replies) {
			var allCals = JSON.parse(replies[0]);
			var group = this.group();
			for (var i=0; i<allCals; i++) {
				if (arrayContains(chosenCals, allCalls[i].title)) {
					getGoogleEventsDate(req, res, i, fromDate, toDate, allCals[i].eventFeedLink, group());
				}
			}
		},
		function returnToWebapp() {
			console.log("Got here, end");
			// res.render('index', {
			// 				page: "calendars"
			// 			});
		}
	);
});

//AJAX Routes
app.get('/splash', function(req, res) {
	res.render('splash', {});
});

app.get('/calendars', function(req, res) {
	var timeArray = makeTimeArray();
	
	client.mget(req.sessionID+':google:calendarList',
	function(err, replies) {
		res.render('calendars', {
			time: timeArray,
			list: JSON.parse(replies[0])
		});
	});
});

//Deploy server

var port = process.env.PORT || 80;
app.listen(port, function(){
	console.log("Listening on " + port);
});

//Helper functions

var getGoogleRequestToken = function(req, res) {
	googleoa.getOAuthRequestToken({"scope": "http://www.google.com/calendar/feeds",
	"oauth_callback": "http://"+SERVERURL+"/googleAuthSuccess"}, 
	function(error, oauth_token, oauth_token_secret, oauth_callback_confirmed, results) {
		if (error) {
			res.send('error: ' + JSON.stringify(error));
		} else {
			res.redirect('https://www.google.com/accounts/OAuthAuthorizeToken?oauth_token=' + oauth_token);

			//console.log('oauth_token: ' + oauth_token);
			//console.log('oauth_token_secret: ' + oauth_token_secret);
			client.set(req.sessionID + ':google:requestToken', oauth_token, redis.print);
			client.set(req.sessionID + ':google:requestTokenSecret', oauth_token_secret, redis.print);
			sys.puts("Requesting access token...");
		}
	});
};

var getGoogleAccessToken = function(req, res, callback) {
	client.mget(req.sessionID + ':google:requestToken', 
	req.sessionID + ':google:requestTokenSecret', 
	req.sessionID + ':google:verifier', 
	function(err, replies) {
		//			console.log(replies[0]); //request token
		//			console.log(replies[1]); //request token secret
		//			console.log(replies[2]); //verifier
		googleoa.getOAuthAccessToken(replies[0], replies[1], replies[2], 
			function(error, oauth_access_token, oauth_access_token_secret, results) {
				if (error) {
					sys.puts('error: ' + sys.inspect(error));
				} else {            
					//console.log(oauth_access_token);
					//console.log(oauth_access_token_secret);
					client.set(req.sessionID+':google:accessToken', oauth_access_token, redis.print);
					client.set(req.sessionID+':google:accessTokenSecret', oauth_access_token_secret, redis.print);
					if (typeof callback === "function") callback();
				}
			});
	});
};

var getGoogleCalendarList = function(req, res, callback) {
	client.mget(req.sessionID + ':google:accessToken', 
	req.sessionID + ':google:accessTokenSecret', 
	function(err, replies) {
		//console.log("access token: "+replies[0]); //access token
		//console.log("access token secret: "+replies[1]); //access token secret

		var requestURL = "https://www.google.com/calendar/feeds/default/allcalendars/full?alt=jsonc";

		googleoa.get(requestURL, replies[0], replies[1], function(error, data, results) {
			if (error) {
				sys.puts('error: ' + sys.inspect(error));
			} else {
				
				var calendarList = JSON.parse(data).data.items;
				//console.log(calendarList);

				client.set(req.sessionID+':google:calendarList', JSON.stringify(calendarList), redis.print);
				if (typeof callback === "function") callback();
			}
		});
	});
};

var getGoogleEventsDate = function(req, res, requestNum, startDate, endDate, calendarFeed, callback) {
	client.mget(req.sessionID + ':google:accessToken', 
	req.sessionID + ':google:accessTokenSecret', 
	req.sessionID + ':google:calendarList',
	function(err, replies) {
		
		var calendarList
		//date/times must be in "2006-03-24T23:59:59" format
		var requestURL = calendarFeed + "?start-min=" + formatDate(startDate) + "&start-max=" + 
			formatDate(endDate) + "&alt=jsonc";

		googleoa.get(requestURL, replies[0], replies[1], function(error, data, results) {
			if (error) {
				sys.puts('error: ' + sys.inspect(error));
			} else {
				console.log("i is :" + requestNum);
				console.log(data);

				client.set(req.sessionID+':google:events:'+i, JSON.stringify(calendarList), redis.print);
				if (typeof callback === "function") callback();
			}
		});
	});
};

//formats in "2006-03-24T23:59:59" format
var formatDate = function(d) {
	var date = d.getFullYear() + '-' + padNum(d.getMonth()) + '-' + padNum(d.getDate())
	+ "T" + padNum(d.getHours()) + ":" + padNum(d.getMinutes()) + ":" + padNum(d.getSeconds());
	return date;
};

//adds leading 0s to single digits
var padNum = function(n) { 
	if (n < 10) {
		return "0" + n;
	} else {
		return n;
	}
};

var makeTimeArray = function() {
	timeArray = new Array();
	
	timeArray.push("12AM");
	for (var i=1; i<=11; i++) {
		timeArray.push(i+"AM");
	}
	
	timeArray.push("12PM");
	for (var i=1; i<=11; i++) {
		timeArray.push(i+"PM");
	}
	return timeArray;
}

var arrayContains = function(array, value) {
	for(var i=0;i<array.length;i++) {
		if (array[i] === value) return true;
	}
	
	return false;
}