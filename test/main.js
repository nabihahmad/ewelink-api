require('dotenv').config();
const https = require("https");
const ewelink = require('ewelink-api');
const atob = require("atob");
const CyclicDb = require("cyclic-dynamodb")
const db = CyclicDb("prussian-blue-snail-tutuCyclicDB")
const electricityDB = db.collection("electricity");

POWER_MEASURING_SWITCH_DEVICEID=process.env.POWER_MEASURING_SWITCH_DEVICEID;
POWER_MEASURING_DUALR3_DEVICEID=process.env.POWER_MEASURING_DUALR3_DEVICEID;
ELECTRICITY_DEVICEID=process.env.ELECTRICITY_DEVICEID;
FOUR_CH_PRO_DEVICEID=process.env.FOUR_CH_PRO_DEVICEID;
FOUR_CH_PROR3_DEVICEID=process.env.FOUR_CH_PROR3_DEVICEID;
WATER_PUMP_DEVICEID=process.env.WATER_PUMP_DEVICEID;
BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID=process.env.BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID;
UPS_INPUT_DEVICEID=process.env.UPS_INPUT_DEVICEID;
UPS_OUTPUT_DEVICEID=process.env.UPS_OUTPUT_DEVICEID;

test();

async function test() {
    var beirutTimezone = (new Date()).getTime() + (120 * 60000);
    const nowTime = new Date(beirutTimezone);
    let hourOfDay = nowTime.getHours();
    console.log("hourOfDay", hourOfDay);

    let connection = new ewelink({
        email: process.env.EWELINK_EMAIL,
        password: atob.atob(process.env.EWELINK_PASSWORD),
        APP_ID: process.env.EWELINK_APP_ID,
        APP_SECRET: process.env.EWELINK_APP_SECRET,
    });
    let electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
    console.log("1");
    if (electricity_device.error == 406) {
        connection = new ewelink({
            email: process.env.EWELINK_EMAIL,
            password: atob.atob(process.env.EWELINK_PASSWORD),
            region: 'us',
        });
        electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
        console.log("2");
        if (electricity_device.error == 406) {
            connection = new ewelink({
                email: process.env.EWELINK_EMAIL,
                password: atob.atob(process.env.EWELINK_PASSWORD),
                region: 'eu',
            });
            electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
            console.log("3");
            if (electricity_device.error == 406) {
                pushoverNotification('Nabih-iPhone', 'inoperative: authentication failed', 'ERROR', 'none');
                // iftttWebhook({message: "Inoperative: authentication failed"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
                responseJson.status = "failed";
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(responseJson));
            }
        }
    }
    const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
    console.log(water_pump_switch_device.online, water_pump_switch_device.params.switch);
    const building_entrance_interior_lighting_device = await connection.getDevice(BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID);
    console.log(building_entrance_interior_lighting_device.online, building_entrance_interior_lighting_device.params.switch);
}

async function test1() {
    var beirutTimezone = (new Date()).getTime() + (120 * 60000);
    const nowTime = new Date(beirutTimezone);
    let hourOfDay = nowTime.getHours();
    console.log("hourOfDay", hourOfDay);

    let connection = new ewelink({
        email: process.env.EWELINK_EMAIL,
        password: atob.atob(process.env.EWELINK_PASSWORD),
        region: 'us',
    });
    electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
    console.log("2");
    if (electricity_device.error == 406) {
        connection = new ewelink({
            email: process.env.EWELINK_EMAIL,
            password: atob.atob(process.env.EWELINK_PASSWORD),
            region: 'eu',
        });
        electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
        console.log("3");
        if (electricity_device.error == 406) {
            console.log("error");
            return;
        }
    }
    const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
    console.log(water_pump_switch_device.online);
    const building_entrance_interior_lighting_device = await connection.getDevice(BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID);
    console.log(building_entrance_interior_lighting_device.online, building_entrance_interior_lighting_device.params.switch);
}