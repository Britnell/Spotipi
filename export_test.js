
var pixels = require('./led_class.js');

var col = {
	r: 0,
	g: 0,
	b: 0,
	w: 5
}

pixels.connect();
setTimeout(function(){	test();	},3000);

function test(){

	pixels.setAll(col);
	pixels.update();
	setTimeout(function(){  test(); },1000);
}


// const events = require('events');
// var AirbarF = require('./airbar_class.js');

// var airbarEvents = new events.EventEmitter();

// airbarEvents.on('test', (val)=>{
// 	console.log('heureca!', val);
// });

// airbarEvents.on('BUTTA', function(){
// 	console.log('BUtton A!');
// });
// airbarEvents.on('BUTTB', function(){
// 	console.log('BUtton B!');
// });
// airbarEvents.on('BUTTC', function(){
// 	console.log('BUtton C!');
// });

// airbarEvents.on('SWIPE_RIGHT', function(){
// 	console.log(' Swipe right!');
// });

// airbarEvents.on('SWIPE_LEFT', function(){
// 	console.log(' Swipe left!');
// });

// airbarEvents.on('VOLUME', function(val){
// 	console.log(' Volume : ', val );
// });


// AirbarF(airbarEvents);
