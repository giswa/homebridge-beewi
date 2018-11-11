# homebridge-beewi

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge)

This code enable the control of a beewi light bulb over BLE using homebridge

You will need to install Noble to have this plugin running : https://github.com/noble/noble


## Configuration

simply add the Bluetooth address of each lightbulb required as a separate accessory in the Homebridge `config.json` file:

```
  "accessories": [
    {
      "accessory": "BeeWiBulb",
      "name": "Main Bedroom Light",
      "address": "ff:ee:dd:cc:bb:aa"
    }
  ]

```


The code is based on homebridge-superlights : See [Homebridge-superlights](https://github.com//SFrost007/homebridge-superlights/)


## Changelog

Actual version is beta. Work in progress. Will be submitted to NPM asap.  
