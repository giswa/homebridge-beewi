var Noble = require('noble');
var Service, Characteristic;

var SERVICE =  "a8b3fff04834405189d03de95cddd318" ;
var WRITE_CHARACTERISTIC = "a8b3fff14834405189d03de95cddd318" ;
var READ_CHARACTERISTIC =  "a8b3fff24834405189d03de95cddd318" ;


//Limits for Scanning
var noOfSeqScans = 0;
const maxNoOfSeqScans = 5;

// code based on Superlights / Avea

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory("homebridge-beewi", "BeeWiBulb", BeeWiBulb);
}

function BeeWiBulb(log, config) {
	this.log = log;
	this.name = config["name"]
	this.address = config["address"]
	// this.minBrightness = config["minBrightness"];

	//Internal data
    this.perifSel = null;
    this.scanning = false;

	/**
	 * Initialise the HAP Lightbulb service and configure characteristic bindings
	 */
	this.lightService = new Service.Lightbulb(this.name);

    this.lightService
        .getCharacteristic(Characteristic.Name)
        .on('get', this.getName.bind(this));

	this.lightService
		.getCharacteristic(Characteristic.On) // BOOL
		.on('set', this.setPowerState.bind(this))
		.on('get', this.getPowerState.bind(this));

	this.lightService
		.addCharacteristic(new Characteristic.Brightness()) // INT (0-100)
		.on('set', this.setBrightness.bind(this))
		.on('get', this.getBrightness.bind(this));

	this.lightService
		.addCharacteristic(new Characteristic.Saturation()) // FLOAT (0-100)
		.on('set', this.setSaturation.bind(this))
		.on('get', this.getSaturation.bind(this));

	this.lightService
		.addCharacteristic(new Characteristic.Hue()) // FLOAT (0-360)
		.on('set', this.setHue.bind(this))
		.on('get', this.getHue.bind(this));
 
	
	this.writeCharacteristic = null;
	this.readCharacteristic = null ;

	//Initialise the Noble service for talking to the bulb
    Noble.on('stateChange', this.nobleStateChange.bind(this));
    Noble.on('scanStop', this.nobleScanStop.bind(this));


	// Array for keeping track of callback objects
	this.readCallbacks = [];

	// Wrapper for storing previous values before running 'identify' flash
	this.preIdentifyValues = {};
  	

}

BeeWiBulb.prototype.getServices = function() {
	this.log.debug("getService");
	return [this.lightService];
}

BeeWiBulb.prototype.getName = function(callback) {
	 this.log.debug("getName :", this.name);
     callback(null, this.name);
}

BeeWiBulb.prototype.identify = function(callback) {
	callback(null) ;
}

/**
 * Getters/setters for publicly exposed characteristics for the bulb
 **/
BeeWiBulb.prototype.setPowerState = function(powerState, callback) {
	this.log.info("setPowerState: " + powerState);
	this.powerState = powerState;
	this.writeToBulb(function(){
		callback(null);
	});
}

BeeWiBulb.prototype.getPowerState = function(callback) {
	this.log.info("getPowerState called");
	this.readFromBulb(function(error) {
		this.log.info("Returning from getPowerState: " + (error === null ? this.powerState : "ERROR"));
		callback(error, error === null ? this.powerState : null);
	}.bind(this));
}

BeeWiBulb.prototype.getBrightness = function (callback) {
    this.log.debug("getBrightness called");
    this.readFromBulb(function (error) {
        this.log.debug("Returning from getBrightness: " + (error === null ? this.brightness : "ERROR"));
        callback(error, error === null ? this.brightness : null);
    }.bind(this));
}

BeeWiBulb.prototype.setBrightness = function (value, callback) {
    this.log.debug("setBrightness: " + value);
    if (value > 0 && this.minBrightness !== undefined) {
        // Adjust brightness level to fall within the usable range of the bulb
        value = this.minBrightness + (value / 100) * (100 - this.minBrightness);
        this.log.debug("... Adjusted to ranged value: " + value);
    }
    this.brightness = value;
    this.writeToBulb(function () {
        callback(null);
    });
}


BeeWiBulb.prototype.getSaturation = function (callback) {
    this.log.debug("getSaturation called");
    this.readFromBulb(function (error) {
        this.log.debug("Returning from getSaturation: " + (error === null ? this.saturation : "ERROR"));
        callback(error, error === null ? this.saturation : null);
    }.bind(this));
}


BeeWiBulb.prototype.setSaturation = function (value, callback) {
    this.log.debug("setSaturation: " + value);
    this.saturation = value;
    this.writeToBulb(function () {
        callback(null);
    });
}


BeeWiBulb.prototype.setHue = function (value, callback) {
    this.log.debug("setHue: " + value);
    this.hue = value;
    this.writeToBulb(function () {
        callback(null);
    });
}


BeeWiBulb.prototype.getHue = function (callback) {
    this.log.debug("getHue called");
    this.readFromBulb(function (error) {
        this.log.debug("Returning from getHue: " + (error === null ? this.hue : "ERROR"));
        callback(error, error === null ? this.hue : null);
    }.bind(this));
}



/**
 * Noble discovery callbacks
 **/
BeeWiBulb.prototype.nobleStateChange = function(state) {
	if (state == "poweredOn") {
        this.log.info("Starting BLE scan");
        /* Noble.on('scanStop', function () {
            setTimeout(function () {
                this.log.info('Restart from scan stop');
                this.startScanningWithTimeout();
            }.bind(this), 2500);
        }.bind(this)); */
        Noble.on("discover", this.nobleDiscovered.bind(this));
        this.startScanningWithTimeout();
        this.scanning = true;
    } else {
        this.log.info("BLE state change to " + state + "; stopping scan.");
        Noble.removeAllListeners('scanStop');
        Noble.stopScanning();
        this.scanning = false;
    }
}

BeeWiBulb.prototype.nobleDiscovered = function(accessory) {
	var peripheral = accessory ;
		this.log.info("Discovered:", peripheral.uuid);
        if (this.perifSel == null) {
            if ((peripheral.address  == this.address) ) {
                this.perifSel = peripheral;
                this.log.info("found bulb :" + this.address );
                this.stopScanning();
                this.scanning = false;

                accessory.connect(function(error){
					this.nobleConnected(error, accessory);
				}.bind(this));

                /*this.bulb = new AveaBulb.Avea(this.perifSel);
                this.bulb.connect(function (error) {
                    this.onBulbConnect(error, peripheral);
                }.bind(this));
				*/
            } else {
                this.log.info("adress not matching");
            }
        } else {
            // do a reconnect if uuid matches
            if (peripheral.address == this.address) {
                this.log.info("Lost bulb appears again!");
                this.perifSel = peripheral;
                if (this.perifSel.state != "connected") {
                    Noble.stopScanning();
                    this.scanning = false;

                    accessory.connect(function(error){
						this.nobleConnected(error, accessory);
					}.bind(this));

                    /*this.bulb = new AveaBulb.Avea(this.perifSel);
                    this.bulb.connect(function (error) {
                        this.onBulbConnect(error, peripheral);
                    }.bind(this));
					*/
                } else {
                    this.log.info("Undefined state");
                }
            } else {
                this.log.info("This is not the bulb you are looking for");
            }
        }



}

BeeWiBulb.prototype.nobleConnected = function(error, accessory) {
	if (error) return this.log.error("Noble connection failed: " + error);
	this.log.info("Connection success, discovering services");
	Noble.stopScanning();
	accessory.discoverServices([SERVICE], this.nobleServicesDiscovered.bind(this));
	accessory.on('disconnect', function(error) {
		this.nobleDisconnected(error, accessory);
	}.bind(this));
}

BeeWiBulb.prototype.nobleDisconnected = function(error, accessory) {
    this.log.info("Disconnected from " + accessory.address + ": " + (error ? error : "(No error)"));
    this.readCharacteristic = null;
    this.writeCharacteristic = null;
    accessory.removeAllListeners('disconnect');
	this.log.info("Restarting BLE scan");
	Noble.startScanning([], false);
}

BeeWiBulb.prototype.nobleServicesDiscovered = function(error, services) {
	if (error) return this.log.error("BLE services discovery failed: " + error);
	//for (var service of services) {
		services[0].discoverCharacteristics([], this.nobleCharacteristicsDiscovered.bind(this));

	//}
}

BeeWiBulb.prototype.nobleCharacteristicsDiscovered = function(error, characteristics) {
	if (error) return this.log.error("BLE characteristic discovery failed: " + error);
	for (var characteristic of characteristics) {
		//this.log.info("Found Characteristic: " + characteristic.uuid);
		if (characteristic.uuid == WRITE_CHARACTERISTIC) {
			this.log.debug("Found Write Characteristic: " + characteristic.uuid);
			this.writeCharacteristic = characteristic;
		}
		if (characteristic.uuid == READ_CHARACTERISTIC) {
			this.log.debug("Found Read Characteristic: " + characteristic.uuid);
			this.readCharacteristic = characteristic;
		}
		if (  this.readCharacteristic != null &&  this.writeCharacteristic != null ){
			this.log.info("Found all Characteristic. Stopping scan." );
			Noble.stopScanning();
			break ;
		}
	}
	// get value from bulb
	this.readFromBulb(function (error) {
        //
    })
	
}

BeeWiBulb.prototype.nobleScanStop =  function () {
        this.log.debug("ScanStop received");
        if (this.perifSel == null && maxNoOfSeqScans > noOfSeqScans++) {
            //Retry scan
            setTimeout(function () {
                this.log.debug('Retry from scan stop');
                this.startScanningWithTimeout();
            }.bind(this), 2500);
        } else {
            this.scanning = false;
        }
    }

BeeWiBulb.prototype.startScanningWithTimeout = function () {
        Noble.startScanning() ; //[SERVICE], false);
        setTimeout(function () {
            if (Noble.listenerCount('discover') == 0) { return; }
            this.log.debug('Discovery timeout');
            Noble.stopScanning();
            this.scanning = false;
        }.bind(this), 12500);
    }


BeeWiBulb.prototype.stopScanning = function () {
        Noble.removeListener('discover', this.nobleDiscovered.bind(this))
        if (Noble.listenerCount('discover') == 0) {
            Noble.removeAllListeners('scanStop');
            Noble.stopScanning();
        }
    }



/**
 * Functions for interacting directly with the lightbulb's RGB property
 **/
BeeWiBulb.prototype.readFromBulb = function(callback) {
	this.log.info("Starting read from bulb" );
	if (this.readCharacteristic == null) {
		this.log.info("Read Characteristic not yet found. Skipping..");
		callback(false);
		return;
	}
	this.readCallbacks.push(callback);

	if (this.readCallbacks.length > 1) {
		this.log.info("Outstanding 'readFromBulb' request already active."
			+ " Adding callback to queue. (" + this.readCallbacks.length + ")");
	} else {
		// this.log.info("No callback queue, sending 'read' call to readCharacteristic");
		this.readCharacteristic.read(function(error, buffer) {
			this.log.debug("Executing BLE 'read' callback");
			if (error === null) {
				this.log.debug("Got success response from readCharacteristic");
				var p = buffer.readUInt8(0);
				var r = buffer.readUInt8(1);
				var g = buffer.readUInt8(2);
				var b = buffer.readUInt8(3);

				var hsv = this.rgb2hsv(r, g, b);
				this.hue = hsv.h;
				this.saturation = hsv.s;
				this.brightness = hsv.v;
				this.powerState = p > 0;

				this.log.debug("Get: "
					+ "rgb("+r+","+g+","+b+") "
					+ "= hsv("+hsv.h+","+hsv.s+","+hsv.v+") "
					+ "(" + (this.powerState ? "On" : "Off") + ")");

			} else {
				this.log.info("Read from BLE characteristic failed: " + error);
			}

			this.log.info("Sending result to " + this.readCallbacks.length + " queued callbacks");
			this.readCallbacks.forEach(function(queuedCallback, index) {
				queuedCallback(error);
			});
			this.log.info("Clearing callback queue");
			this.readCallbacks = [];
		}.bind(this));
	}

}

BeeWiBulb.prototype.writeToBulb = function(callback) {
	this.log.info("Starting write to bulb" );
	if (this.writeCharacteristic == null) {
		this.log.warn("Characteristic not yet found. Skipping..");
		callback(false);
		return;
	}
	
	var rgb = this.hsv2rgb(this.hue, this.saturation, this.brightness);
	this.log.info("Set: "
		+ "hsv("+this.hue+","+this.saturation+","+this.brightness+") "
		+ "= rgb("+rgb.r+","+rgb.g+","+rgb.b+") "
		+ "power :" + this.powerState ) ;

    //full white = bytearray([85,19,255,255,255,13,10])

	var buffer = Buffer.alloc(7);
	
    buffer.writeUInt8(85, 0);
    buffer.writeUInt8(19, 1);
	buffer.writeUInt8(rgb.r , 2);
	buffer.writeUInt8(rgb.g , 3);
    buffer.writeUInt8(rgb.b , 4);
    buffer.writeUInt8(13, 5);
    buffer.writeUInt8(10, 6);

	this.writeCharacteristic.write(buffer, false);
	
	if (this.powerState) 
		this.writeCharacteristic.write(new Buffer([85,16, 1,13,10]), false);
	else
		this.writeCharacteristic.write(new Buffer([85,16, 0,13,10]), false);

	callback();
}

// From http://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
BeeWiBulb.prototype.rgb2hsv = function(r, g, b) {
	var rr, gg, bb,
			r = r / 255,
			g = g / 255,
			b = b / 255,
			h, s,
			v = Math.max(r, g, b),
			diff = v - Math.min(r, g, b),
			diffc = function(c){
					return (v - c) / 6 / diff + 1 / 2;
			};

	if (diff == 0) {
			h = s = 0;
	} else {
			s = diff / v;
			rr = diffc(r);
			gg = diffc(g);
			bb = diffc(b);

			if (r === v) {
					h = bb - gg;
			}else if (g === v) {
					h = (1 / 3) + rr - bb;
			}else if (b === v) {
					h = (2 / 3) + gg - rr;
			}
			if (h < 0) {
					h += 1;
			}else if (h > 1) {
					h -= 1;
			}
	}
	return {
			h: Math.round(h * 360),
			s: Math.round(s * 100),
			v: Math.round(v * 100)
	};
}

// From https://gist.github.com/eyecatchup/9536706
BeeWiBulb.prototype.hsv2rgb = function(h, s, v) {
		var r, g, b;
		var i;
		var f, p, q, t;
		 
		// Make sure our arguments stay in-range
		h = Math.max(0, Math.min(360, h));
		s = Math.max(0, Math.min(100, s));
		v = Math.max(0, Math.min(100, v));
		 
		// We accept saturation and value arguments from 0 to 100 because that's
		// how Photoshop represents those values. Internally, however, the
		// saturation and value are calculated from a range of 0 to 1. We make
		// That conversion here.
		s /= 100;
		v /= 100;
		 
		if(s == 0) {
				// Achromatic (grey)
				r = g = b = v;
				return {
						r: Math.round(r * 255), 
						g: Math.round(g * 255), 
						b: Math.round(b * 255)
				};
		}
		 
		h /= 60; // sector 0 to 5
		i = Math.floor(h);
		f = h - i; // factorial part of h
		p = v * (1 - s);
		q = v * (1 - s * f);
		t = v * (1 - s * (1 - f));
		 
		switch(i) {
				case 0: r = v; g = t; b = p; break;
				case 1: r = q; g = v; b = p; break;
				case 2: r = p; g = v; b = t; break;
				case 3: r = p; g = q; b = v; break;
				case 4: r = t; g = p; b = v; break;
				default: r = v; g = p; b = q;
		}
		 
		return {
				r: Math.round(r * 255), 
				g: Math.round(g * 255), 
				b: Math.round(b * 255)
		};
}
