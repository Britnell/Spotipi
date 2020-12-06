var HID = require('node-hid');
var devices = HID.devices();

// console.log(' HID devices : ', devices);

var airbar;

console.log(' USB devices ', devices );
devices.forEach((dev)=>{
	
	if(dev.manufacturer.includes('Neonode')){
		console.log(' opening NEONODE : ');
		open_airbar(dev);
	}
})

function open_airbar(dev){
	// * Open & close once to reset
	airbar = new HID.HID(dev.path);
	setTimeout(function(){ 
		airbar.close();
		setTimeout(()=>{
			airbar = new HID.HID(dev.path);
			airbar.on("data", function(data) {
				// console.log(' [data] ', data );
				airbar_packet(data);
			});

			airbar.on("error", function(err) {
				console.log(' [Error] ', err );
				airbar.close();
			});
		},800);
	},800);

	

	// setTimeout(function(){
	// 	console.log(' [CLOSE] ')
	// 	airbar.close();
	// }, 4000);
}

// https://support.neonode.com/docs/display/AIRTSUsersGuide/zForce+Message+Specification#zForceMessageSpecification-TouchFormatTouchFormat
var last_released = 0;
var touch_ids= [];
var last_touches = 0;

function airbar_packet(data){
	
	// let time = data[3]*255+data[2];
	let touches = data[1];
	let round = 100;
	let packets = [
		{	
			id: data[4],	
			x:   Math.floor((data[5]+data[6]*255)/round),		
			y:   Math.floor((data[7]+data[8]*255)/round)
		},
		{
			id: data[13],
			x:  Math.floor((data[14]+data[15]*255)/round),
			y:  Math.floor((data[16]+data[17]*255)/round)
		}
	];

	// console.log('--AIR', data[1] );

	if(touches==1)
	{
		// 1 Finger

		let tch = packets[0];
		if(touch_ids.includes(tch.id)) {
			if(last_touches==2)
				one_finger_begin(tch);
			else
				one_finger_move(tch);
		}
		else if(touch_ids.includes(tch.id+1)){
			touch_ids.splice(touch_ids.indexOf(tch.id+1),1);
			one_finger_end();
		}
		else {
			touch_ids.push(tch.id);
			one_finger_begin(tch);
		}


		// Eo 1 Finger
	}
	else{
		// 2 Fingers
		
		let releases = 0;

		// process events & count changes
		packets.forEach((tch)=>{
			if(touch_ids.includes(tch.id)) {
				// Move
			}
			else if(touch_ids.includes(tch.id+1)){
				releases++;
				touch_ids.splice(touch_ids.indexOf(tch.id+1),1);
			}
			else {
				touch_ids.push(tch.id);
			}
		});

		if(releases==0){
			if(last_touches==2)
				two_finger_move(packets);
			else 
				two_finger_begin(packets);
		}
		else {
			// Release
			two_finger_end();
			// if(touch_ids[0]==packets[0].id)				two_finger_release(packets[0]);				
		}

		// Eo 2 Fingers
	}

	last_touches = touches;

	// Eo airbar
}

var state = 'main';

var finger = {};
var two = [];

function one_finger_begin(touch){
	console.log(' [1F]\tT: ',touch);
	finger.begin = touch;
	finger.last = touch;
	// * gesture variables
	swipe_dist = 0;
}

function one_finger_move(touch){
	console.log('\t[1F]\t',touch);
	
	let delta = {
		x: touch.x - finger.last.x,
		y: touch.y - finger.last.y
	}
	
	// detect_buttons(touch);
	// detect_swipe(touch, delta);

	finger.last = touch;
}

function one_finger_end(){
	console.log(' [1F]\tRelease ');
}


function two_finger_begin(touches){
	two.begin = touches;
	two.last = touches;
	console.log(' [2F]\tT: ',touches);
}

function two_finger_move(touches){
	console.log('\t[2F]\t',touches);	
	// two_finger_slide(touches, two.last);

	two.last = touches;
}

function two_finger_end(){
	console.log(' [2F]\tRelease ');
}

const button_trigger_lower = 50;
const button_trigger_higher =80;
const button_size = 50;
const buttons = [
	{
		id: 'A',
		pos: 100,
		state: false
	},
	{
		id: 'B',
		pos: 300,
		state: false
	},
	{
		id: 'C',
		pos: 500,
		state: false
	}
];

function detect_buttons(touch){
	buttons.forEach((butt)=>{
		if( Math.abs(touch.x-butt.pos) < button_size ){
			// X is on button
			if(!butt.state){
				// button is off
				if(touch.y<button_trigger_lower){
					butt.state = true;
					console.log(' BUTT : ', butt.id );
				}
			}
			else {
				// but is on
				if(touch.y > button_trigger_higher){
					butt.state = false;
				}

			}
		}
	});
	// Eo buttons
}

var swipe_dist = 0;
const swipe_thresh = 70;	// 100 for total width
const swipe_height = 120;
var last_swipe = swipe_dist;

function detect_swipe(touch, delta){
	if(touch.y > swipe_height){
		swipe_dist += delta.x / 6;
		let round = Math.round(swipe_dist);
		if(round != last_swipe){
			// console.log(' SWIPE ', round );
			if(round > swipe_thresh ){
				console.log(' SWIPE RIGHT ');
				swipe_dist = 0;
			}
			else if(round < -swipe_thresh){
				console.log(' SWIPE LEFT ');
				swipe_dist = 0;
			}
			last_swipe = round;
		}
	}

}


var volume = 50;
var last_volume = volume;

function two_finger_slide(touches, last){
	let mid = ( touches[0].y + touches[1].y ) /2;
	let prev_m = (last[0].y + last[1].y ) /2;
	volume += ( mid - prev_m ) / 6;		// modify volume
	volume = limit(volume, 0,100);		// limit
	// * round for triggering
	let round = Math.round(volume);		
	if(round != last_volume){
		console.log(' VOLUME ', round );
		last_volume = round;
	}
}

function round(x, places){
	return Math.round(x*places)/places;
}

function limit(x, min,max ){
	if( x< min)
		x = min;
	else if(x>max)
		x = max;
	return x;
}





// #############