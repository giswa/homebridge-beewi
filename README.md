# homebridge-beewi

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge)

This code enable the control of a beewi light bulb over BLE using homebridge

You will need to install Noble to have this plugin running : https://github.com/noble/noble

## Installation 

Until the code is submitted to npm, you can make this run manually : 

- Create a folder "homebridge-beewi" in the node_modules folder (in your home directory)  
- Copy the index.js file inside this "homebridge-beewi" folder (so : ~/node_modules/homebridge-beewi/index.js )
- restart homebridge.

## Configuration

Add the Bluetooth address of each lightbulb required as a separate accessory in the Homebridge `config.json` file:

```json
  "accessories": [
    {
      "accessory": "BeeWiBulb",
      "name": "Main Bedroom Light",
      "address": "ff:ee:dd:cc:bb:aa"
    }
  ]

```

You can find the address by checking the log output of homebridge :

```
Homebridge is running on port 51826.
[BeeWi light] Starting BLE scan
[BeeWi light] Discovered: 5992f6c8406b
[BeeWi light] adress not matching
[BeeWi light] Discovered: c4be84e094d4
[BeeWi light] adress not matching
[BeeWi light] Discovered: 5b2d0489329c
```


The code is based on homebridge-superlights : See [Homebridge-superlights](https://github.com//SFrost007/homebridge-superlights/)


## Changelog

Actual version is beta. Work in progress. Will be submitted to NPM asap.  
