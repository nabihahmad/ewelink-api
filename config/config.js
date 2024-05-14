AWS = require('aws-sdk');

// Configure the AWS SDK with your credentials and the Frankfurt region
AWS.config.update({
    accessKeyId: process.env.DYNAMODB_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.DYNAMODB_AWS_SECRET_ACCESS_KEY,
    region: 'eu-central-1' // Frankfurt region
});

// Create a new DynamoDB instance
dynamodb = new AWS.DynamoDB();

// const CyclicDb = require("cyclic-dynamodb")
// const db = CyclicDb("prussian-blue-snail-tutuCyclicDB")
// const electricityDB = db.collection("electricity");

POWER_MEASURING_SWITCH_DEVICEID=process.env.POWER_MEASURING_SWITCH_DEVICEID;
POWER_MEASURING_DUALR3_DEVICEID=process.env.POWER_MEASURING_DUALR3_DEVICEID;
ELECTRICITY_DEVICEID=process.env.ELECTRICITY_DEVICEID;
FOUR_CH_PRO_DEVICEID=process.env.FOUR_CH_PRO_DEVICEID;
FOUR_CH_PROR3_DEVICEID=process.env.FOUR_CH_PROR3_DEVICEID;
WATER_PUMP_DEVICEID=process.env.WATER_PUMP_DEVICEID;
// BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID=process.env.BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID;
UPS_INPUT_DEVICEID=process.env.UPS_INPUT_DEVICEID;
UPS_OUTPUT_DEVICEID=process.env.UPS_OUTPUT_DEVICEID;

DUALR3_HEATER_SWITCH = 2;