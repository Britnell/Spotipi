const SerialPort = require('serialport');
var sleep = require('sleep');

// to find dev just type in terminal ~ls /dev/tty and hit tab to auto completem then plug in / out your arduino and see what is missing
var arduinoport = '/dev/ttyUSB0';

// const port = new SerialPort(arduinoport, {
//   baudRate: 115200
// });
var port;


// * LEDs
var LEDS, pixelArray;


function connect(){
  LEDS = 50;
  
  pixelArray = new Uint8Array(LEDS*4+1);    // RGBW
  
  console.log(' pA ', pixelArray );
    // pixelArray = new Uint8Array(LEDS*3+1);   // RGB

  pixelArray[pixelArray.length-1]=255;  

  // * open port

  port = new SerialPort(arduinoport, { baudRate: 115200 },function (err) {
    if (err) {
      return console.log('Error: ', err.message)
    }
    else{
      console.log(" PORT ",arduinoport, ' opened ');
    }
  });


  // Open errors will be emitted as an error event
  port.on('error', function(err) {
    console.log(' [ COM PORT ] Error: ', err.message)
  });

  port.on('data',function(data){
    console.log(' [ COM PORT ] Rec :\t',data.toString() );
  });

  // Eo connect
}

function send_pixels(){
  // console.log(pixelArray);
  port.write(pixelArray, function(err) {
    if (err) {
      return console.log('WrErr:', err.message);
    }
  }); 
}

function set_pixel(col,x)
{
  pixelArray[(x*4)+0] =col.r;
  pixelArray[(x*4)+1] =col.g;
  pixelArray[(x*4)+2] =col.b;
  pixelArray[(x*4)+3] =col.w;  
}

function set_pixels(col,from,to)
{
  for( var x=from; x<to; x++){
      pixelArray[(x*4)+0] =col.r;
      pixelArray[(x*4)+1] =col.g;
      pixelArray[(x*4)+2] =col.b;
      pixelArray[(x*4)+3] =col.w;
  }
}

function set_all(col)
{
  for( var x=0; x<LEDS; x++){
      pixelArray[(x*4)+0] =col.r;
      pixelArray[(x*4)+1] =col.g;
      pixelArray[(x*4)+2] =col.b;
      pixelArray[(x*4)+3] =col.w;
  }
}


exports.connect = connect;
exports.update = send_pixels;
exports.setPixel = set_pixel;
exports.setPixels = set_pixels;
exports.setAll = set_all;