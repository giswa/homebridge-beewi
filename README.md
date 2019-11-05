# homebridge-beewi

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge)

It enables the control of a beewi light bulb over BLE using homebridge

You will need NodeJS version 8.6 (or superior) and have Noble installed : https://github.com/noble/noble

## Installation 

Install using npm : 

```console
npm install homebridge-beewi
```

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


This code is based on homebridge-superlights : See [Homebridge-superlights](https://github.com//SFrost007/homebridge-superlights/)


## Changelog

0.0.2  Changed dependencie to @abandonware/noble fork. Noble initial github project seems to have stopped. 
0.0.1  Initial version and npm package

