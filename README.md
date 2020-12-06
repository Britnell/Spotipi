# Spotipi
Building a smart device for spotify from a raspberry pi

# What? 

This lets you stream spotify to your raspberry pi through Raspotify, i.e. upgrade any old speaker to a spotify streaming speaker.
On top of that I wanted an interface to actually start streaming spotify without getting out my phone. I am using a Neonode zForce (airbar) for some fanshy air swipes & gestures but you can replace it with some physical buttons too.
The control is done via the spotify web api for node.js .

I will try and soon add some more documentation over at [Workout.Wonday.eu](https://workout.wonday.eu/)

# Install & Setup

This is just going to be a dump of my development notes : 

Raspotify

INSTALL

	1. Install raspbian
		a. https://www.raspberrypi.org/downloads/raspbian/

	2. Setup pi
		a. Sudo raspi-config
hostname : raspotify
change PW : ______
enable SSH
setup Wifi

		b. Sudo apt-get update
		c. sudo apt-get dist-upgrade 
		
	3. Install raspotify
		a. https://github.com/dtcooper/raspotify#easy-installation

		curl -sL https://dtcooper.github.io/raspotify/install.sh | sh
	4. It should work - magic!

		a. As so often Im annoyed with things that are supposed to just work - it didnt for me.
So first : check your audio.

		b. I had HDMI plugged in, it will probably automatically play sound through HDMI
you can change HDMI vs audio jack sound output in raspi-config > advanced > audio

		c. Volume : 
Sound is default controlled with the alsamixer
In terminal, just type :
alsamixer
which gave me an error, so alternatively try :
alsamixer -c 0
for default sound card, if you are using a USB sound card it will probably -c 1

	5. Install node.js

		curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install -y nodejs
		
	6. Install GIT

		sudo apt-get install git

	7. Samba server for easy work work

		Install
		sudo apt-get install samba samba-common-bin
		
		Setup 


		- sudo nano /etc/samba/smb.conf

	[Samba Share]
	Comment = Pi shared samba folder
	Path = /home/pi
	Browseable = yes
	Writeable = Yes
	only guest = no
	create mask = 0777
	directory mask = 0777
	Public = yes
	Guest ok = yes
			
		- Sudo service smbd restart

		- Remember you need also to grant file read & write rights via terminal. You can run it once on the entire folder
sudo chmod -R 777 Folder/

		- You can now open in file explorer, just go to \\HOSTNAME 
enter the pi username & pw, and you should see a folder named "Samba Share"  or whatever you called it
		

	Change settings in :	sudo nano /etc/default/raspotify
		sudo systemctl restart raspotify
	

# Node.js & Spotify API

spotify-web-api-node
	https://www.npmjs.com/package/spotify-web-api-node
	https://github.com/thelinmichael/spotify-web-api-node


Install :

Npm i spotify-web-api-node express --save

Nodemon
npm install nodemon --save-dev

Add to package.json	"scripts": {
	    "test": "echo \"Error: no test specified\" && exit 1",
	    "dev": "nodemon spotify.js"
	  },
	Then run with
npm run dev

Forever

 npm install forever -g

Autostart with crontab -e	@reboot forever start -c node  /home/pi/Spotipi/spotipi.js &
Forever	Forever list


 setup API & allow at
https://developer.spotify.com/dashboard/login


Authorization Code Flow
This flow is suitable for long-running applications in which the user grants permission only once. 
From <https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow> 

Example
https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/app.js


Node js exports
https://www.sitepoint.com/understanding-module-exports-exports-node-js/

# Neonode zForce

https://neonode.com/technologies/zforce/
Neonode produces these awesome touchbars that give you a really large surface area. are just stuck on top so can be retrofitted really easily. BUT because they work optically you can also point them up and use them for in air gestures 
 
here is their decent support pages
https://support.neonode.com/docs/

and git repo
https://github.com/neonode-inc

You want to play around with these for a bit, check out the Neonode Workbench first probably. Then you can test that with the airbar.js , I then turned that into a class that can just be imported from the main module.
Node can access it through npm : node-hid https://www.npmjs.com/package/node-hid

Here I first had some issues and tried the following : 

Failed due to libusb-1.0 not being found :

sudo apt-get install libusb-dev
sudo apt install libusb-1.0-0 libusb-1.0-0-dev
sudo apt install libudev-dev 

IT WORKSKSSSSS

{
    vendorId: 5430,
    productId: 257,
    path: '/dev/hidraw0',
    serialNumber: '1.7.2',
    manufacturer: 'Neonode',
    product: 'zForceAIR 346 ExtendedRange',
    release: 512,
    interface: 0
  }

Airbar.js is also handling all the raw data packets and converting them to easier touch_begin touch_drag & touch_end events that I am used to from processing and the likes.
