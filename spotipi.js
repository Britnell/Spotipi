const fs = require('fs');

const fetch = require('node-fetch');
const express = require('express');
const app = require('express')();
const server = require('http').Server(app);
const events = require('events');

var AirbarF = require('/home/pi/Spotipi/airbar_class.js');
const pixels = require('/home/pi/Spotipi/led_class.js');

const SpotifyWebApi = require('spotify-web-api-node');
const secrets = require('/home/pi/Spotipi/secrets.js');


const api_scope = 'user-read-playback-state user-modify-playback-state';		// user-read-private user-read-email


// *********************************************** Read progam data file

var program_data;
var re_authenticate = true;


read_data();


function read_data(){
	// check file exists
	fs.exists('/home/pi/Spotipi/program_data.json', function(exists) {
	    if (exists) {
	    	// * read
	    	fs.readFile('/home/pi/Spotipi/program_data.json', function readFileCallback(err, data) {
	            if (err) {
	                console.log(err);
	            } 
	            else {
	            	try 
	            	{
				    	program_data = JSON.parse(data);
                		check_data();
				    } 
				    catch (e) {
				    	// 
				    	console.log(' program data read error ', e );
				    	program_data = {};
				    }
	            }
	        });
	    }
	    else {
	        console.log("file not exists");
	        // program_data = {}; 
	        // write_program_data();
	    }
	    //
	});
}


function write_program_data(){
	write_data('/home/pi/Spotipi/program_data.json',program_data);
}

function write_data(filename,obj){
    let json = JSON.stringify(obj);
    fs.writeFile(filename, json,'utf8', function(err){ 
    	if(err)
    		return console.log(' write error ', err); 
    } );
}


function check_data(){
	if(program_data.hasOwnProperty('access_token') && program_data.hasOwnProperty('refresh_token') ){
		//
		if(program_data.refresh_token.length!=0 ){
			// we have some kind of tokens
			console.log(' loaded program data ', program_data );
			refresh_tokens();
			// re_authenticate = false;
			// test them!
		}
		else {
			// cant do anything, wait for login callback
		}
	}
}



// ********************************************** Spotify

// * Set up Spotify API
var spotifyApi = new SpotifyWebApi({
  clientId: secrets.client_id,
  clientSecret: secrets.client_secret,
  redirectUri: secrets.redirect_uri
});

// * https://github.com/thelinmichael/spotify-web-api-node/blob/master/examples/access-token-refresh.js
function get_tokens(code) {

	spotifyApi.authorizationCodeGrant(code).then(
	  function(data) {
	  	// Set the access token and refresh token
	  	receive_tokens(data.body);
	    console.log('Retrieved tokens' );
	    main();
	  },
	  function(err) {
	    console.log('Access token error ', err.message);
	  }
	);
}

function get_tokens2(code) {
	console.log('Get tokens (POST)');

	const body = 'grant_type=authorization_code'
			 +'&redirect_uri=' +encodeURIComponent(secrets.redirect_uri)
			 +'&code=' +code
			 +'&client_id=' +secrets.client_id
			 +'&client_secret=' +secrets.client_secret;

	const response = fetch("https://accounts.spotify.com/api/token", {
		method: 'post',
		body: body,
		headers: {'Content-Type': 'application/x-www-form-urlencoded'}
	})
	.catch(err => console.error(' token POST error ', err))
	.then( res => res.json() )
	.then( json => { receive_tokens(json); } )
	.catch(err => console.log(' recieve error ', err) );
}

function receive_tokens(json){
	if(json.hasOwnProperty('access_token')){
		program_data['access_token'] = json['access_token'];
		spotifyApi.setAccessToken(json['access_token']);
	}
	if(json.hasOwnProperty('refresh_token')){
		program_data['refresh_token'] = json['refresh_token'];
		spotifyApi.setRefreshToken(json['refresh_token']);
	}
	re_authenticate = false;
	// * write new tokens to memory
	write_program_data();
	// return null;
}

function refresh_tokens(){

	const body = 'grant_type=refresh_token'
			 +'&refresh_token=' +program_data.refresh_token
			 // +'&redirect_uri=' +encodeURIComponent(secrets.redirect_uri)
			 +'&client_id=' +secrets.client_id
			 +'&client_secret=' +secrets.client_secret;

	const response = fetch("https://accounts.spotify.com/api/token", {
		method: 'post',
		body: body,
		headers: {'Content-Type': 'application/x-www-form-urlencoded'}
	})
	.catch(err => console.error(' token POST error ', err))
	.then( res => res.json() )
	.then( json => { 
		console.log(' refreshed ! ');
		receive_tokens(json); 
		main();
	})
	.catch(err => console.log(' recieve error ', err) );

}



function check_playing(){
	// check devices
	
	spotifyApi.getMyDevices()
		.then(function(data) {
			console.log(' got devices : ');
			// dev.id
			// dev.name
			// dev.is_active
			// dev.colume_percent
			let availableDevices = data.body.devices;
			let  is_active = false;

			availableDevices.forEach((dev)=>{
				console.log(' :: dev ', dev);
				if(dev.id.includes(program_data.dev_id) || dev.name.includes(program_data.dev_name) ){
					is_active = dev.is_active;
				}
			});
			if(!is_active){
				play_on_dev();
			}
			// else console.log(' were already playing');
			
		}, 
		function(err) {
			error_handler(err);
		});
}


async function play_on_dev(){
	spotifyApi.transferMyPlayback([program_data.dev_id],{play: true})
	.then(function(resp) {
		console.log(' ~ Play! ');
	}, 
	function(err) {
		error_handler(err);
	});
}

function pause(){
	spotifyApi.pause()
	.then(function() {
		console.log('Playback paused');
	}, function(err) {
		error_handler(err);
	});
}

function next_track(){
	spotifyApi.skipToNext()
	.then(function() {
		console.log('SKipped track');
	}, 
	function(err) {
		error_handler(err);
	});
}

function previous_track(){
	spotifyApi.skipToPrevious()
	.then(function() {
		console.log('Skipped previous ');
	}, 
	function(err) {
		error_handler(err);
	});
}


function play_pause(){
	// get current state
	spotifyApi.getMyCurrentPlaybackState()
	.then(function(data) {
		// Output items
		console.log(' PLAYPAUSE \n playback state :  ', data.body.is_playing, data.body.device);

		if(data.body.hasOwnProperty('device')){

			if( data.body.is_playing && data.body.device.id == program_data.dev_id){
				console.log(' were already playing, PAUSE ');
				pause();// play_on_dev();
			}
			else {
				console.log(' whatever ekse, play here!')
				play_on_dev();
			}
		}		
		else {
			console.log('  PLaying nowhere - start playing on here  ');	
			play_on_dev();
		}
	}, 
	function(err) {
		error_handler(err);
	});
}
// ******************************************** Express Server 



const port = 3000;

app.get('/', (req,res) => {
 	if(re_authenticate)
 		res.sendFile(__dirname +'/login.html');
 	else
 		res.sendFile(__dirname +'/home.html');
});

app.get('/login', function(req, res) {
  console.log(' LOGIN ' );

  // if(!re_authenticate)  	res.redirect('/');	else
	  res.redirect('https://accounts.spotify.com/authorize'
			      +'?response_type=code'
			      +'&client_id=' +secrets.client_id
			      +'&scope=' +escape(api_scope)
			      +'&redirect_uri=' +encodeURIComponent(secrets.redirect_uri)
			      +'&state=sawasawasawasawa');
	    
});

app.get('/callback', function(req, res) {
	console.log(' got the code ');
	var code = req.query.code || null;
	var state = req.query.state || null;
	if (state === null || state == 'sawasawasawasawa') {
		// * request tokens
		get_tokens(code);
	}
	res.redirect('/');

	// Eo callback 
});


app.get('/refresh', function(req, res) {
	console.log(' GET refresh tokens ');
	refresh_tokens();
	res.redirect('/');
});

app.get('/play', function(req,res){
	console.log(' GET PLAY ');
	check_playing();
	res.redirect('/');
});

app.get('/next', function(req,res){
	console.log(' GET NEXT ');
	next_track();
	res.redirect('/');
});

app.get('/previous', function(req,res){
	console.log(' GET PREVIOUS ');
	previous_track();
	res.redirect('/');
});


// * Get a User's Available Devices
//	 spotifyApi.getMyDevices()
// https://developer.spotify.com/documentation/web-api/reference/player/get-a-users-available-devices/

// * Transfer a User's Playback
// 		spotifyApi.transferMyPlayback(deviceIds)
// https://developer.spotify.com/documentation/web-api/reference/player/transfer-a-users-playback/


app.listen(port);
console.log(' server running on port :', port);

// * set up Pixels
var green = {
	r: 0,
	g: 5,
	b: 0,
	w: 0
}

var black = {
	r: 0,
	g: 0,
	b: 0,
	w: 0
}

pixels.connect();

setTimeout(function(){
	pixel_green();
	setTimeout(pixel_buttons, 1600 );
}, 3000 );


function pixel_green(){
	pixels.setAll(green);
	pixels.update();
}

function pixel_buttons(){
	pixels.setAll(black);
	pixels.setPixels(green, 6,9 );
	pixels.setPixels(green, 23, 26 );
	pixels.setPixels(green, 41, 44 );
	pixels.update();
}

var volTimer, lampTimer;

function pixel_slider(vol){
	// calc pixel val
	let v = Math.round( scale(vol, 0,100, 10,40 ) );
	// * draw pixels
	pixels.setAll(black);
	pixels.setPixels(green, 9, v );
	if(v<40)		pixels.setPixels(black, v, 40 );
	pixels.update();
}

function pixel_volume(vol){
	// calc pixel val
	let v = Math.round( scale(vol, 0,100, 10,40 ) );
	// * draw pixels
	pixels.setAll(black);
	pixels.setPixels(green, 9, v );
	if(v<40)		pixels.setPixels(black, v, 40 );
	pixels.update();

	// * cancel previous timers
	if(volTimer)
		clearTimeout(volTimer);
	// * timer to stop volume display
	volTimer = setTimeout(pixel_buttons,2000);
}

function pixel_lamp(){
	pixels.setAll(lampColor);
	pixels.update();
}

function color( hue, bright){

}

var lampColor = {r: 0, g:0, b: 0, w: 0 };
var bright = 0;

function lamp_col(hue, bright){
	// update col
	if(bright<70)
		lampColor = hslToRgbw(hue/100,0.9,bright/100);
	else
		lampColor = {r: 0, g:0, b: 0, w: bright };

	console.log(hue, bright,'\t> ', lampColor);
	// * draw lamp
	pixel_lamp();
}

function hslToRgbw(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: r * 254, g: g * 254, b: b * 254 , w: 0 };
}

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}


// ######################################################################## SPOTIFY #####################



// * Get Information About The User's Current Playback State
// 		spotifyApi.getMyCurrentPlaybackState()
// https://developer.spotify.com/documentation/web-api/reference/player/get-information-about-the-users-current-playback/

	// * Get the User's Currently Playing Track 
	// https://developer.spotify.com/documentation/web-api/reference/player/get-the-users-currently-playing-track/
	// spotifyApi.getMyCurrentPlayingTrack()


// spotifyApi.setVolume(50)
// spotifyApi.play()
// spotifyApi.skipToNext()
// spotifyApi.skipToPrevious()



var airbarEvents = new events.EventEmitter();

airbarEvents.on('test', (val)=>{
	console.log('heureca!', val);
});

airbarEvents.on('BUTTA', function(){
	play_pause();
});

// airbarEvents.on('BUTTB', function(){});

airbarEvents.on('BUTTC', function(){
	console.log('BUtton C ');
});

airbarEvents.on('SWIPE_RIGHT', function(){
	console.log(' Swipe right ');
	spotifyApi.skipToNext()
	.then(function() {
		console.log(' [SPOTIFY] SKipped track');
	}, 
	function(err) {
		error_handler(err);
	});
	console.log(' [Airbar] swipe right');
});

airbarEvents.on('SWIPE_LEFT', function(){
	spotifyApi.skipToNext()
	.then(function() {
		console.log(' [SPOTIFY] SKipped previous');
	}, 
	function(err) {
		error_handler(err);
	});
	console.log(' [AIRBAR] swipe left ');
});

airbarEvents.on('LAMP', function(val){
	if(lampTimer)			clearTimeout(lampTimer);
	let bright = val.x;
	let hue = val.y;

	lamp_col(hue,bright);

});

var twofingertimer;
var twofinger_release_ignore = false;

airbarEvents.on('EVENT', function(val){
	console.log(' [EVENT] ', val );
	if(val=='1FBEGIN'){
		if(!twofinger_release_ignore){
			pixel_buttons();
			// stop fade out timer if there is one
			if(lampTimer)			clearTimeout(lampTimer);
		}
		else {
			console.log(' ignore 1F becuase 2F ');
		}
	}
	else if(val=='1FEND'){
		lampTimer = setTimeout(function(){
			pixel_lamp();
		},2000);
	}
	else if(val=='2FBEGIN'){
		// show lamp incase 1Finger stopped it
		pixel_lamp();
	}
	else if(val=='2FEND'){
		twofinger_release_ignore = true;
		twofingertimer = setTimeout(function(){
			twofinger_release_ignore = false;
		}, 500 );
	}
})

airbarEvents.on('SLIDER', function(val){

	if(val=='STOP'){
		pixel_buttons();
	}
	else {
		pixel_slider(val);
		spotifyApi.setVolume(parseInt(val,10))
		  .then(function () {
		     console.log(' [SPOTIFY] Changed volume : ', val );
		  }, function(err) {
		     error_handler(err);
		  });
		// 
	}
});

console.log(' Starting Airbar gesture interface ');
AirbarF(airbarEvents);




function main(){
	console.log(' OK were in - Main');
	
	spotifyApi.getMyCurrentPlaybackState()
		.then(function(data) {
			// Output items	
			console.log("Playback ", data.body.device, data.body.item );
		}, 
		function(err) {
			error_handler(err);
		});

	  // setTimeout(main,1000);
}


function error_handler(error){
	console.log(' [SOTIFYY] received error : ', error );

}

function scale(x,min,max, ymin,ymax ){
	let r = (x-min)/(max-min);
	return ymin + r * (ymax-ymin);
}


function limit(x,min,max){
	if( x >max)
		x = max;
	else if(x<min)
		x = min;
	return x;
}