const {
  ewelinkEmail,
  ewelinkPassword,
  ewelinkAppID,
  ewelinkAppSecret,
  electricityDeviceID,
  waterPumpDeviceID,
  buildingEntranceInteriorLightingDeviceID,
} = require("../../config/env");
const pushover = require("../services/pushover");
const ewelink = require("ewelink-api");
const atob = require("atob");
const { U_NABIH } = require("../constants/enums");

exports.connect = async (req, res) => {
  let responseJson = {};
  var beirutTimezone = new Date().getTime() + 120 * 60000;
  const nowTime = new Date(beirutTimezone);
  let hourOfDay = nowTime.getHours();
  console.log("hourOfDay", hourOfDay);

  let connection = new ewelink({
    email: ewelinkEmail,
    password: atob.atob(ewelinkPassword),
    APP_ID: ewelinkAppID,
    APP_SECRET: ewelinkAppSecret,
  });
  let electricity_device = await connection.getDevice(electricityDeviceID);
  console.log("1");
  if (electricity_device.error == 406) {
    connection = new ewelink({
      email: ewelinkEmail,
      password: atob.atob(ewelinkPassword),
      region: "us",
    });
    electricity_device = await connection.getDevice(electricityDeviceID);
    console.log("2");
    if (electricity_device.error == 406) {
      connection = new ewelink({
        email: ewelinkEmail,
        password: atob.atob(ewelinkPassword),
        region: "eu",
      });
      electricity_device = await connection.getDevice(electricityDeviceID);
      console.log("3");
      if (electricity_device.error == 406) {
        pushover.sendPushNotification("Nabih-iPhone", "inoperative: authentication failed", "ERROR", "none");
        responseJson.status = "failed";
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(responseJson));
      }
    }
  }
  const water_pump_switch_device = await connection.getDevice(waterPumpDeviceID);
  console.log(water_pump_switch_device.online, water_pump_switch_device.params.switch);
  const building_entrance_interior_lighting_device = await connection.getDevice(buildingEntranceInteriorLightingDeviceID);
  console.log(building_entrance_interior_lighting_device.online);
  if (building_entrance_interior_lighting_device.online) console.log(building_entrance_interior_lighting_device.params.switch);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
  return;
};

exports.notification = async (req, res) => {
  let responseJson = {};
  let requestBody = req.body;
  let message = requestBody.message != null ? requestBody.message : "";
  let title = requestBody.title != null ? requestBody.title : "";
  let sound = requestBody.sound != null ? requestBody.sound : "";
  console.log("message", message);
  console.log("title", title);
  console.log("sound", sound);
  console.log("user-agent", req.get("user-agent"));

  await pushover.sendPushNotification(U_NABIH, message, title, sound);
  responseJson.status = "success";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};
