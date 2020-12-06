const fs = require('fs');

const fetch = require('node-fetch');
const express = require('express');
const app = require('express')();
const server = require('http').Server(app);
const events = require('events');

var AirbarF = require('./airbar_class.js');

const SpotifyWebApi = require('spotify-web-api-node');
var secrets = require('./secrets.js');


var api_scope = 'user-read-playback-state user-modify-playback-state';		// user-read-private user-read-email



// *********************************************** Read progam data file

var program_data;
var re_authenticate = true;


read_data();


function read_data(){
	// check file exists
	fs.exists('program_data.json', function(exists) {
	    if (exists) {
	    	// * read
	    	fs.readFile('program_data.json', function readFileCallback(err, data) {
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
	write_data('program_data.json',program_data);
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
		console.log(' playing ', data.body.is_playing, data.body.device);
		if(data.body.device.id != program_data.dev_id){
			console.log(' not playing on dev! ');
			play_on_dev();
		}
		else if(data.body.is_playing){
			console.log(' PAUSE');
			pause();
		}
		else {
			console.log(' PLAY! ');	
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



// * Set up Spotify API
var spotifyApi = new SpotifyWebApi({
  clientId: secrets.client_id,
  clientSecret: secrets.client_secret,
  redirectUri: secrets.redirect_uri
});



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
	console.log('BUtton A!');
});

airbarEvents.on('BUTTB', function(){
	play_pause();
});

airbarEvents.on('BUTTC', function(){
	console.log('BUtton C!');
});

airbarEvents.on('SWIPE_RIGHT', function(){
	console.log(' Swipe right ');
	spotifyApi.skipToNext()
	.then(function() {
		console.log('SKipped track');
	}, 
	function(err) {
		error_handler(err);
	});
});

airbarEvents.on('SWIPE_LEFT', function(){
	console.log(' Swipe left');
	spotifyApi.skipToNext()
	.then(function() {
		console.log('SKipped previous');
	}, 
	function(err) {
		error_handler(err);
	});
});

airbarEvents.on('VOLUME', function(val){
	console.log(' 2 Figner swipe : ', val );
	spotifyApi.setVolume(parseInt(val,10))
	  .then(function () {
	    console.log('Changed volume .');
	    }, function(err) {
	    //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
	    console.log('Something went wrong!', err);
	  });
});


console.log(' Starting Airbar gesture interface ');
AirbarF(airbarEvents);



function main(){
	console.log(' OK were in');

	spotifyApi.getMyCurrentPlaybackState()
		.then(function(data) {
			// Output items	
			console.log("Playback ", data.body.device, data.body.item );
		}, 
		function(err) {
			error_handler(err);
		});


	// spotifyApi.getMe()
	//   .then(function(data) {
	//     console.log('Some information about the authenticated user', data.body);
	//   }, function(err) {
	//     console.log('Something went wrong!', err);
	//   });

	  // setTimeout(main,1000);
}

function loop(){

	setTimeout(loop,1000);
}

function error_handler(error){
	console.log(' received #ERROR !!!! ', error );

}

// * connect & run main on connection
// connect_api(main);

// spotifyApi.getAlbum('5U4W9E5WsYb2jUQWePT8Xm')
//   .then(function(data) {
//     console.log('Album information', data.body);
//   }, function(err) {
//     console.error(err);
//   });