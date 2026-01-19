const {
  disableScript,
  ewelinkEmail,
  ewelinkPassword,
  ewelinkAppID,
  ewelinkAppSecret,
  electricityDeviceID,
  fourCHPROR3DeviceID,
  upsInputDeviceID,
  powerMeasuringSwitchDeviceID,
  powerMeasuringDualR3DeviceID,
  dualR3HeaterSwitch,
  dualR3KidsACSwitch,
  waterCoolerDeviceID,
  waterPumpDeviceID,
  upsOutputDeviceID,
  automatedHeater,
} = require("../../config/env");
const { U_NABIH, U_ROHAN, U_AMIR, USERS_ARABIC } = require("../constants/enums");
const helpers = require("../utils/helpers");
const redisModel = require("../models/redis");
const pushover = require("../services/pushover");
const ewelink = require("ewelink-api");
const atob = require("atob");
const messages = require("../utils/messages");

exports.handleMain = async (req, res) => {
  let responseJson = {};
  let redisUpdate = {};
  if (!disableScript) {
    var beirutTimezone = new Date().getTime() + 120 * 60000;
    const nowTime = new Date(beirutTimezone);
    let hourOfDay = nowTime.getHours();
    // let dayOfWeek = nowTime.getDay();
    const userAgent = req.get("user-agent");

    let lastRunAt = await redisModel.getParam("lastRunAt");
    if (lastRunAt == null) {
      await redisModel.initRedisDefaultConfigParams();
      pushover.sendPushNotification(U_NABIH, "Init Redis Config", "push-notification-title", "siren");
    }
    let enableHeaterOnGenerator = await redisModel.getParam("enableHeaterOnGenerator");
    let enableWaterPumpOnGenerator = await redisModel.getParam("enableWaterPumpOnGenerator");
    let enableWaterPumpOnElectricity = await redisModel.getParam("enableWaterPumpOnElectricity");
    let enableUpsOnGenerator = await redisModel.getParam("enableUpsOnGenerator");
    let lastState = await redisModel.getParam("lastState");
    let offlineOrNoElectricityCount = await redisModel.getParam("offlineOrNoElectricityCount");
    let upsDischargedAt = await redisModel.getParam("upsDischargedAt");
    // let automatedAC = await redisModel.getParamAsList('automatedAC');
    let automatedAC = null; // TODO: change type to store properly in redis
    let heaterTurnedOnAutomatically = await redisModel.getParam("heaterTurnedOnAutomatically");

    let diffMs = 0,
      diffMins = 0;
    if (lastRunAt != null) {
      diffMs = nowTime - parseInt(lastRunAt); // milliseconds between now & lastRunAt
      diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
      if (diffMins > 10) {
        pushover.sendPushNotification(
          U_NABIH,
          "Inoperative: scheduler not working " + diffMins + ", " + lastRunAt + ", " + nowTime,
          "push-notification-title",
          "siren",
        );
      }
    }
    console.log("Schedule status:", lastRunAt, nowTime.getTime(), diffMs, diffMins, userAgent);
    redisUpdate.lastRunAt = nowTime.getTime().toString();

    let loginMethod = helpers.getEmailDomain(ewelinkEmail) + " + cred";
    let connection = new ewelink({
      email: ewelinkEmail,
      password: atob.atob(ewelinkPassword),
      APP_ID: ewelinkAppID,
      APP_SECRET: ewelinkAppSecret,
    });
    let electricity_device = await connection.getDevice(electricityDeviceID);
    if (electricity_device.error == 406) {
      loginMethod = helpers.getEmailDomain(ewelinkEmail) + " + us";
      connection = new ewelink({
        email: ewelinkEmail,
        password: atob.atob(ewelinkPassword),
        region: "us",
      });
      electricity_device = await connection.getDevice(electricityDeviceID);
      if (electricity_device.error == 406) {
        loginMethod = helpers.getEmailDomain(ewelinkEmail) + " + eu";
        connection = new ewelink({
          email: ewelinkEmail,
          password: atob.atob(ewelinkPassword),
          region: "eu",
        });
        electricity_device = await connection.getDevice(electricityDeviceID);
        if (electricity_device.error == 406) {
          loginMethod = "failed";
          pushover.sendPushNotification(U_NABIH, "inoperative: authentication failed", "ERROR", "none");
          responseJson.status = "failed";
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify(responseJson));
          return;
        }
      }
    }
    console.log(
      "Running mode:",
      hourOfDay,
      enableHeaterOnGenerator,
      enableWaterPumpOnGenerator,
      enableWaterPumpOnElectricity,
      enableUpsOnGenerator,
      lastState,
      offlineOrNoElectricityCount,
      loginMethod,
    );

    const four_ch_pro_r3_device = await connection.getDevice(fourCHPROR3DeviceID);
    const ups_input_device = await connection.getDevice(upsInputDeviceID);

    let notificationMessage = "";
    if (electricity_device.online) {
      responseJson.online = true;
      responseJson.electricity = true;
      console.log("Electricity");
      if (lastState == 0) {
        console.log("logElectricity 1 for state", lastState);
        redisUpdate.lastState = "1";
        notificationMessage = messages.get("electricity-on", "en");
        pushover.sendPushNotification(U_ROHAN, notificationMessage, "push-notification-title", "pushover");
        pushover.broadcastPushNotification(USERS_ARABIC, "electricity-on", "push-notification-title", "pushover");
      }
      redisUpdate.offlineOrNoElectricityCount = "0";

      if (electricity_device.params.switch == "on") {
        if (automatedHeater != null && automatedHeater == "main") {
          const power_measuring_switch_device = await connection.getDevice(powerMeasuringSwitchDeviceID);
          console.log(
            "Switch powerMeasuringSwitchDeviceID",
            power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline",
          );
          if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "off") {
            const status = await connection.toggleDevice(powerMeasuringSwitchDeviceID);
            notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated main heater on";
            console.log("Toggle powerMeasuringSwitchDeviceID", status);
            redisUpdate.heaterTurnedOnAutomatically = "1";
          }
        } else if (automatedHeater != null && automatedHeater == "kitchen") {
          const power_measuring_dualr3_device = await connection.getDevice(powerMeasuringDualR3DeviceID);
          console.log(
            "Switch powerMeasuringDualR3DeviceID",
            power_measuring_dualr3_device.online ? power_measuring_dualr3_device.params.switches[dualR3HeaterSwitch - 1].switch : "offline",
          );
          if (
            power_measuring_dualr3_device.online &&
            power_measuring_dualr3_device.params.switches[dualR3HeaterSwitch - 1].switch == "off"
          ) {
            const status = await connection.toggleDevice(powerMeasuringDualR3DeviceID, dualR3HeaterSwitch);
            notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated kitchen heater on";
            console.log("Toggle powerMeasuringDualR3DeviceID channel " + dualR3HeaterSwitch, status);
            redisUpdate.heaterTurnedOnAutomatically = "1";
          }
        }

        if (automatedAC != null && automatedAC == "true") {
          for (let i = 0; automatedAC && i < automatedAC.length; i++) {
            let tmpSwitch = automatedAC[i].S;
            if (tmpSwitch == "KIDS") {
              const power_measuring_dualr3_device = await connection.getDevice(powerMeasuringDualR3DeviceID);
              console.log(
                "Switch powerMeasuringDualR3DeviceID",
                power_measuring_dualr3_device.online
                  ? power_measuring_dualr3_device.params.switches[dualR3HeaterSwitch - 1].switch
                  : "offline",
              );
              if (
                power_measuring_dualr3_device.online &&
                power_measuring_dualr3_device.params.switches[dualR3KidsACSwitch - 1].switch == "off"
              ) {
                const status = await connection.toggleDevice(powerMeasuringDualR3DeviceID, dualR3KidsACSwitch);
                notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated Kids AC on";
                console.log("Toggle powerMeasuringDualR3DeviceID channel " + dualR3KidsACSwitch, status);
              }
            } else if (
              tmpSwitch != "KIDS" &&
              four_ch_pro_r3_device.online &&
              four_ch_pro_r3_device.params.switches[tmpSwitch - 1].switch == "off"
            ) {
              const status = await connection.toggleDevice(fourCHPROR3DeviceID, tmpSwitch);
              notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated " + tmpSwitch + " AC on";
              console.log("Toggle fourCHPROR3DeviceID channel " + tmpSwitch, status);
            }
          }
        }

        if (hourOfDay >= 7 && hourOfDay < 22) {
          const water_cooler_switch_device = await connection.getDevice(waterCoolerDeviceID);
          if (water_cooler_switch_device.online && water_cooler_switch_device.params.switch == "off") {
            const status = await connection.toggleDevice(waterCoolerDeviceID);
            console.log("Toggle waterCoolerDeviceID", status);
            notificationMessage += (notificationMessage != "" ? ", " : "") + "Water cooler on";
          }
        }
      }

      if (enableWaterPumpOnElectricity == 0) {
        const water_pump_switch_device = await connection.getDevice(waterPumpDeviceID);
        if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
          const status = await connection.toggleDevice(waterPumpDeviceID);
          console.log("Toggle waterPumpDeviceID", status);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
          pushover.sendPushNotification(U_AMIR, "إطفاء طرمبة الماء", "push-notification-title", "bike");
        }
      }

      const ups_output_device = await connection.getDevice(upsOutputDeviceID);
      if (
        ups_input_device.online &&
        ups_output_device.online &&
        (ups_input_device.params.switch == "off" || ups_output_device.params.switch == "off")
      ) {
        if (ups_output_device.params.switch == "off") {
          await connection.toggleDevice(upsOutputDeviceID);
          await helpers.sleep(2000);
        }
        if (ups_input_device.params.switch == "off") await connection.toggleDevice(upsInputDeviceID);
        if (upsDischargedAt != 0) redisUpdate.upsDischargedAt = "0";
        notificationMessage += (notificationMessage != "" ? ", " : "") + "Charging UPS on electricity";
      } else if (ups_input_device.online && !ups_output_device.online && upsDischargedAt == 0) {
        redisUpdate.upsDischargedAt = nowTime.getTime().toString();
        notificationMessage += (notificationMessage != "" ? ", " : "") + "UPS Discharged";
      } else if (
        upsDischargedAt != 0 &&
        ups_input_device.online &&
        ups_output_device.online &&
        ups_input_device.params.switch == "on" &&
        ups_output_device.params.switch == "on"
      ) {
        redisUpdate.upsDischargedAt = "0";
      }
      if (notificationMessage != "") {
        pushover.sendPushNotification(U_NABIH, notificationMessage, "push-notification-title", "pushover");
      }
    } else if (!electricity_device.online && ups_input_device.online && four_ch_pro_r3_device.online) {
      responseJson.online = true;
      responseJson.electricity = false;
      redisUpdate.offlineOrNoElectricityCount = "0";
      console.log("No electricity");
      if (lastState == 1) {
        console.log("logElectricity 0 for state", lastState);
        redisUpdate.lastState = "0";
        notificationMessage = messages.get("electricity-off", "en");
        pushover.sendPushNotification(U_ROHAN, notificationMessage, "push-notification-title", "gamelan");
        pushover.broadcastPushNotification(USERS_ARABIC, "electricity-off", "push-notification-title", "gamelan");
      }

      if (enableHeaterOnGenerator == 0 || heaterTurnedOnAutomatically == 1) {
        const power_measuring_switch_device = await connection.getDevice(powerMeasuringSwitchDeviceID);
        if (
          power_measuring_switch_device.online &&
          power_measuring_switch_device.params.switch == "on" &&
          heaterTurnedOnAutomatically == 1
        ) {
          const status = await connection.toggleDevice(powerMeasuringSwitchDeviceID);
          console.log("Toggle powerMeasuringSwitchDeviceID", status);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated main heater off";
          redisUpdate.heaterTurnedOnAutomatically = "0";
        }

        const power_measuring_dualr3_device = await connection.getDevice(powerMeasuringDualR3DeviceID);
        if (
          power_measuring_dualr3_device.online &&
          power_measuring_dualr3_device.params.switches[dualR3HeaterSwitch - 1].switch == "on" &&
          heaterTurnedOnAutomatically == 1
        ) {
          const status = await connection.toggleDevice(powerMeasuringDualR3DeviceID, dualR3HeaterSwitch);
          console.log("Toggle powerMeasuringDualR3DeviceID channel " + dualR3HeaterSwitch, status);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated kitchen heater off";
          redisUpdate.heaterTurnedOnAutomatically = "0";
        }
      }

      if (
        enableWaterPumpOnGenerator == 0 &&
        (hourOfDay < 4 || hourOfDay > 6) &&
        (hourOfDay < 10 || hourOfDay > 12) &&
        (hourOfDay < 14 || hourOfDay > 16)
      ) {
        const water_pump_switch_device = await connection.getDevice(waterPumpDeviceID);
        // console.log("Switch waterPumpDeviceID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
        if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
          const status = await connection.toggleDevice(waterPumpDeviceID);
          console.log("Toggle waterPumpDeviceID", status);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
          pushover.sendPushNotification(U_AMIR, "إطفاء طرمبة الماء", "push-notification-title", "bike");
        }
      } else if (enableWaterPumpOnGenerator == 1) {
        const water_pump_switch_device = await connection.getDevice(waterPumpDeviceID);
        // console.log("Switch waterPumpDeviceID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
        if (
          ((hourOfDay >= 0 && hourOfDay <= 2) ||
            (hourOfDay >= 5 && hourOfDay <= 6) ||
            (hourOfDay >= 9 && hourOfDay <= 11) ||
            (hourOfDay >= 13 && hourOfDay <= 15)) &&
          water_pump_switch_device.online &&
          water_pump_switch_device.params.switch == "off"
        ) {
          const status = await connection.toggleDevice(waterPumpDeviceID);
          console.log("Toggle waterPumpDeviceID", status);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump on";
          pushover.sendPushNotification(U_AMIR, "تشغيل طرمبة الماء", "push-notification-title", "bike");
        } else if (
          (hourOfDay < 0 ||
            (hourOfDay > 2 && hourOfDay < 5) ||
            (hourOfDay > 6 && hourOfDay < 9) ||
            (hourOfDay > 11 && hourOfDay < 13) ||
            hourOfDay > 15) &&
          water_pump_switch_device.online &&
          water_pump_switch_device.params.switch == "on"
        ) {
          const status = await connection.toggleDevice(waterPumpDeviceID);
          console.log("Toggle waterPumpDeviceID", status);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
          pushover.sendPushNotification(U_AMIR, "إطفاء طرمبة الماء", "push-notification-title", "bike");
        }
      }

      const water_cooler_switch_device = await connection.getDevice(waterCoolerDeviceID);
      if (water_cooler_switch_device.online && water_cooler_switch_device.params.switch == "on") {
        const status = await connection.toggleDevice(waterCoolerDeviceID);
        console.log("Toggle waterCoolerDeviceID", status);
        notificationMessage += (notificationMessage != "" ? ", " : "") + "Water cooler off";
      }

      const ups_input_device = await connection.getDevice(upsInputDeviceID);
      if (ups_input_device.online && enableUpsOnGenerator == 0) {
        const ups_output_device = await connection.getDevice(upsOutputDeviceID);
        if (ups_output_device.online && (ups_input_device.params.switch == "on" || ups_output_device.params.switch == "on")) {
          if (ups_input_device.params.switch == "on") {
            await connection.toggleDevice(upsInputDeviceID);
            await helpers.sleep(2000);
          }
          if (ups_output_device.params.switch == "on") await connection.toggleDevice(upsOutputDeviceID);
          notificationMessage += (notificationMessage != "" ? ", " : "") + "Stopping UPS charging on electricity";
        } else if (ups_input_device.online && !ups_output_device.online && upsDischargedAt == 0) {
          redisUpdate.upsDischargedAt = nowTime.getTime().toString();
          notificationMessage += (notificationMessage != "" ? ", " : "") + "UPS Discharged";
        }
      }
      if (notificationMessage != "") {
        pushover.sendPushNotification(U_NABIH, notificationMessage, "push-notification-title", "gamelan");
      }
    } else if (!electricity_device.online && !ups_input_device.online && !four_ch_pro_r3_device.online) {
      responseJson.online = false;
      const water_pump_switch_device = await connection.getDevice(waterPumpDeviceID);
      let locationString = water_pump_switch_device.online ? "at home" : "in the building";
      console.log("No electricity or network " + locationString);
      if (offlineOrNoElectricityCount != null && parseInt(offlineOrNoElectricityCount) == 6) {
        redisUpdate.offlineOrNoElectricityCount = "0";
        console.log("No electricity or network for 30 minutes " + locationString);
        pushover.sendPushNotification(
          U_NABIH,
          "No electricity or network for 30 minutes " + locationString,
          "push-notification-title",
          "vibrate",
        );
        pushover.sendPushNotification(
          U_ROHAN,
          "No electricity or network for 30 minutes " + locationString,
          "push-notification-title",
          "vibrate",
        );
      } else if (offlineOrNoElectricityCount != null) {
        let tmpVal = parseInt(offlineOrNoElectricityCount) + 1;
        redisUpdate.offlineOrNoElectricityCount = tmpVal.toString();
      } else {
        redisUpdate.offlineOrNoElectricityCount = "1";
      }
    }

    if (Object.keys(redisUpdate).length > 0) {
      await redisModel.setParams(redisUpdate);
    }

    console.log("Script done!");
    responseJson.status = "success";
  } else {
    console.log("Script disabled!");
    responseJson.status = "disabled";
  }
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
  return;
};
