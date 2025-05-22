express = require('express');
app = express();
app.use(express.json())
require('dotenv').config();
ewelink = require('ewelink-api');
atob = require("atob");
const utils = require('./utils.js');
require('./config/config.js');
require('./config/endpoints.js');

app.post('/ewelink', async (req, res) => {
	let responseJson = {};
	let redisUpdate = {};
	if (process.env.DISABLE_SCRIPT == "false") {
		var beirutTimezone = (new Date()).getTime() + (120 * 60000);
		const nowTime = new Date(beirutTimezone);
		let hourOfDay = nowTime.getHours();
		// let dayOfWeek = nowTime.getDay();

		let lastRunAt = await utils.getRedisConfigParam('lastRunAt');
		if (lastRunAt == null) {
			await utils.initRedisDefaultConfigParams();
			utils.pushoverNotification("Nabih-iPhone", "Init Redis Config", 'Electicity Update', 'siren');
		}
		let enableHeaterOnGenerator = await utils.getRedisConfigParam('enableHeaterOnGenerator');
		let enableWaterPumpOnGenerator = await utils.getRedisConfigParam('enableWaterPumpOnGenerator');
		let enableWaterPumpOnElectricity = await utils.getRedisConfigParam('enableWaterPumpOnElectricity');
		let enableUpsOnGenerator = await utils.getRedisConfigParam('enableUpsOnGenerator');
		let lastState = await utils.getRedisConfigParam('lastState');
		let offlineOrNoElectricityCount = await utils.getRedisConfigParam('offlineOrNoElectricityCount');
		let upsDischargedAt = await utils.getRedisConfigParam('upsDischargedAt');
		// let automatedAC = await utils.getRedisConfigParamAsList('automatedAC');
		let automatedAC = null; // TODO: change type to store properly in redis
		let heaterTurnedOnAutomatically = await utils.getRedisConfigParam('heaterTurnedOnAutomatically');
		// let upsInputOnGeneratorCount = await utils.getRedisConfigParam('upsInputOnGeneratorCount');
		// let upsInputOnElectricityCount = await utils.getRedisConfigParam('upsInputOnElectricityCount');

		/*
		let enableHeaterOnGenerator = await utils.getDynamoDBConfigParam('enableHeaterOnGenerator');
		let enableWaterPumpOnGenerator = await utils.getDynamoDBConfigParam('enableWaterPumpOnGenerator');
		let enableWaterPumpOnElectricity = await utils.getDynamoDBConfigParam('enableWaterPumpOnElectricity');
		let enableUpsOnGenerator = await utils.getDynamoDBConfigParam('enableUpsOnGenerator');
		let lastState = await utils.getDynamoDBConfigParam('lastState');
		let offlineOrNoElectricityCount = await utils.getDynamoDBConfigParam('offlineOrNoElectricityCount');
		let lastRunAt = await utils.getDynamoDBConfigParam('lastRunAt');
		let upsDischargedAt = await utils.getDynamoDBConfigParam('upsDischargedAt');
		let automatedAC = await utils.getDynamoDBConfigParamAsList('automatedAC');
		let heaterTurnedOnAutomatically = await utils.getDynamoDBConfigParam('heaterTurnedOnAutomatically');
		// let upsInputOnGeneratorCount = await utils.getDynamoDBConfigParam('upsInputOnGeneratorCount');
		// let upsInputOnElectricityCount = await utils.getDynamoDBConfigParam('upsInputOnElectricityCount');
		*/

		let diffMs = 0, diffMins = 0;
		if (lastRunAt != null) {
			diffMs = (nowTime - parseInt(lastRunAt)); // milliseconds between now & lastRunAt
			diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
			if (diffMins > 10) {
				utils.pushoverNotification("Nabih-iPhone", "Inoperative: scheduler not working " + diffMins + ", " + lastRunAt + ", " + nowTime, 'Electicity Update', 'siren');
			}
		}
		console.log("Schedule status:", lastRunAt, nowTime.getTime(), diffMs, diffMins);
		redisUpdate.lastRunAt = nowTime.getTime().toString();

		let loginMethod = utils.getEmailDomain(process.env.EWELINK_EMAIL) + " + cred";
		let connection = new ewelink({
			email: process.env.EWELINK_EMAIL,
			password: atob.atob(process.env.EWELINK_PASSWORD),
			APP_ID: process.env.EWELINK_APP_ID,
			APP_SECRET: process.env.EWELINK_APP_SECRET,
		});
		let electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
		if (electricity_device.error == 406) {
			loginMethod = utils.getEmailDomain(process.env.EWELINK_EMAIL) + " + us";
			connection = new ewelink({
				email: process.env.EWELINK_EMAIL,
				password: atob.atob(process.env.EWELINK_PASSWORD),
				region: 'us',
			});
			electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
			if (electricity_device.error == 406) {
				loginMethod = utils.getEmailDomain(process.env.EWELINK_EMAIL) + " + eu";
				connection = new ewelink({
					email: process.env.EWELINK_EMAIL,
					password: atob.atob(process.env.EWELINK_PASSWORD),
					region: 'eu',
				});
				electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
				if (electricity_device.error == 406) {
					loginMethod = "failed";
					utils.pushoverNotification('Nabih-iPhone', 'inoperative: authentication failed', 'ERROR', 'none');
					responseJson.status = "failed";
					res.setHeader('Content-Type', 'application/json');
					res.send(JSON.stringify(responseJson));
					return;
				}
			}
		}
		console.log("Running mode:", hourOfDay, enableHeaterOnGenerator, enableWaterPumpOnGenerator, enableWaterPumpOnElectricity, enableUpsOnGenerator, lastState, offlineOrNoElectricityCount, loginMethod);
		
		const four_ch_pro_r3_device = await connection.getDevice(FOUR_CH_PROR3_DEVICEID);
		const ups_input_device = await connection.getDevice(UPS_INPUT_DEVICEID);

		if (electricity_device.online) {
			responseJson.online = true;
			responseJson.electricity = true;
			notificationMessage = "";
			console.log("Electricity");
			if (lastState == 0) {
				console.log("logElectricity 1 for state", lastState);
				redisUpdate.lastState = "1";
				notificationMessage = "Electricity is on";
				utils.pushoverNotification('Rohan-iPhone', notificationMessage, 'Electricity Info', 'pushover');
				utils.pushoverNotification("Asmahan-iPhone", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				utils.pushoverNotification("Ahmad-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				utils.pushoverNotification("Amir-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				utils.pushoverNotification("Tareq-iPhone", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
			}
			redisUpdate.offlineOrNoElectricityCount = "0";

			if(electricity_device.params.switch == "on") {
				if (process.env.AUTOMATED_HEATER != null && process.env.AUTOMATED_HEATER == "main") {
					const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
					console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline");
					if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "off") {
						const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
						notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated main heater on";
						console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
						redisUpdate.heaterTurnedOnAutomatically = "1";
					}
				} else if (process.env.AUTOMATED_HEATER != null && process.env.AUTOMATED_HEATER == "kitchen") {
					const power_measuring_dualr3_device = await connection.getDevice(POWER_MEASURING_DUALR3_DEVICEID);
					console.log("Switch POWER_MEASURING_DUALR3_DEVICEID", power_measuring_dualr3_device.online ? power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch : "offline");
					if (power_measuring_dualr3_device.online && power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch == "off") {
						const status = await connection.toggleDevice(POWER_MEASURING_DUALR3_DEVICEID, DUALR3_HEATER_SWITCH);
						notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated kitchen heater on";
						console.log("Toggle POWER_MEASURING_DUALR3_DEVICEID channel " + DUALR3_HEATER_SWITCH, status);
						redisUpdate.heaterTurnedOnAutomatically = "1";
					}
				}

				if (process.env.AUTOMATED_AC != null && process.env.AUTOMATED_AC == "true") {
					for (let i = 0; automatedAC && i < automatedAC.length; i++) {
						let tmpSwitch = automatedAC[i].S;
						if (tmpSwitch == "KIDS") {
							const power_measuring_dualr3_device = await connection.getDevice(POWER_MEASURING_DUALR3_DEVICEID);
							console.log("Switch POWER_MEASURING_DUALR3_DEVICEID", power_measuring_dualr3_device.online ? power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch : "offline");
							if (power_measuring_dualr3_device.online && power_measuring_dualr3_device.params.switches[DUALR3_KIDS_AC_SWITCH - 1].switch == "off") {
								const status = await connection.toggleDevice(POWER_MEASURING_DUALR3_DEVICEID, DUALR3_KIDS_AC_SWITCH);
								notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated Kids AC on";
								console.log("Toggle POWER_MEASURING_DUALR3_DEVICEID channel " + DUALR3_KIDS_AC_SWITCH, status);
							}
						} else if (tmpSwitch != "KIDS" && four_ch_pro_r3_device.online && four_ch_pro_r3_device.params.switches[tmpSwitch - 1].switch == "off") {
							const status = await connection.toggleDevice(FOUR_CH_PROR3_DEVICEID, tmpSwitch);
							notificationMessage += (notificationMessage != "" ? ", " : "") + "Automated " + tmpSwitch + " AC on";
							console.log("Toggle FOUR_CH_PROR3_DEVICEID channel " + tmpSwitch, status);
						}
					}
				}

				if (hourOfDay >= 7 && hourOfDay < 22) {
					const water_cooler_switch_device = await connection.getDevice(WATER_COOLER_DEVICEID);
					if (water_cooler_switch_device.online && water_cooler_switch_device.params.switch == "off") {
						const status = await connection.toggleDevice(WATER_COOLER_DEVICEID);
						console.log("Toggle WATER_COOLER_DEVICEID", status);
						notificationMessage += (notificationMessage != "" ? ", " : "") + "Water cooler on";
					}
				}
			}

			if (enableWaterPumpOnElectricity == 0) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				// console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
					utils.pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			}

			const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
			if (ups_input_device.online && ups_output_device.online && (ups_input_device.params.switch == "off" || ups_output_device.params.switch == "off")) {
				/*
				if (upsInputOnElectricityCount != null && upsInputOnElectricityCount == 3) {
					redisUpdate.upsInputOnElectricityCount = "0";
					utils.pushoverNotification('Nabih-iPhone', 'Charge UPS on electricity', 'Electricity Info', 'pushover');
				} else if (upsInputOnElectricityCount != null) {
					let tmpVal = upsInputOnElectricityCount + 1;
					redisUpdate.upsInputOnElectricityCount = tmpVal.toString();
				} else {
					redisUpdate.upsInputOnElectricityCount = "1";
				}
				*/
				if (ups_output_device.params.switch == "off") {
					await connection.toggleDevice(UPS_OUTPUT_DEVICEID);
					await utils.sleep(2000);
				}
				if (ups_input_device.params.switch == "off")
					await connection.toggleDevice(UPS_INPUT_DEVICEID);
				if (upsDischargedAt != 0)
					redisUpdate.upsDischargedAt = "0";
				notificationMessage += (notificationMessage != "" ? ", " : "") + "Charging UPS on electricity";
			} else if (ups_input_device.online && !ups_output_device.online && upsDischargedAt == 0) {
				redisUpdate.upsDischargedAt = nowTime.getTime().toString();
				notificationMessage += (notificationMessage != "" ? ", " : "") + "UPS Discharged";
			} else if (upsDischargedAt != 0 && ups_input_device.online && ups_output_device.online && (ups_input_device.params.switch == "on" && ups_output_device.params.switch == "on")) {
				redisUpdate.upsDischargedAt = "0";
			}
			if (notificationMessage != "") {
				utils.pushoverNotification("Nabih-iPhone", notificationMessage, 'Electicity Update', 'pushover');
			}
		} else if (!electricity_device.online && ups_input_device.online && four_ch_pro_r3_device.online) {
			responseJson.online = true;
			responseJson.electricity = false;
			notificationMessage = "";
			redisUpdate.offlineOrNoElectricityCount = "0";
			console.log("No electricity");
			if (lastState == 1) {
				console.log("logElectricity 0 for state", lastState);
				redisUpdate.lastState = "0";
				notificationMessage = "Electricity is off";
				utils.pushoverNotification("Rohan-iPhone", notificationMessage, 'Electicity Update', 'gamelan');
				utils.pushoverNotification("Asmahan-iPhone", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				utils.pushoverNotification("Ahmad-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				utils.pushoverNotification("Amir-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				utils.pushoverNotification("Tareq-iPhone", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
			}

			if (enableHeaterOnGenerator == 0 || heaterTurnedOnAutomatically == 1) {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				// console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline");
				if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "on" && heaterTurnedOnAutomatically == 1) {
					const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
					console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
					redisUpdate.heaterTurnedOnAutomatically = "0";
				}

				const power_measuring_dualr3_device = await connection.getDevice(POWER_MEASURING_DUALR3_DEVICEID);
				// console.log("Switch POWER_MEASURING_DUALR3_DEVICEID", power_measuring_dualr3_device.online ? power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch : "offline");
				if (power_measuring_dualr3_device.online && power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch == "on" && heaterTurnedOnAutomatically == 1) {
					const status = await connection.toggleDevice(POWER_MEASURING_DUALR3_DEVICEID, DUALR3_HEATER_SWITCH);
					console.log("Toggle POWER_MEASURING_DUALR3_DEVICEID channel " + DUALR3_HEATER_SWITCH, status);
					redisUpdate.heaterTurnedOnAutomatically = "0";
				}
			}

			if (enableWaterPumpOnGenerator == 0 && (hourOfDay < 4 || hourOfDay > 6) && (hourOfDay < 10 || hourOfDay > 12) && (hourOfDay < 14 || hourOfDay > 16)) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
					utils.pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			} else if (enableWaterPumpOnGenerator == 1) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
				if (((hourOfDay >= 0 && hourOfDay <= 2) || (hourOfDay >= 5 && hourOfDay <= 6) || (hourOfDay >= 9 && hourOfDay <= 11) || (hourOfDay >= 13 && hourOfDay <= 15)) && water_pump_switch_device.online && water_pump_switch_device.params.switch == "off") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump on";
					utils.pushoverNotification("Amir-Android", "تشغيل طرمبة الماء", "حالة الكهرباء", 'bike');
				} else if ((hourOfDay < 0 || (hourOfDay > 2 && hourOfDay < 5) || (hourOfDay > 6 && hourOfDay < 9) || (hourOfDay > 11 && hourOfDay < 13) || hourOfDay > 15) && water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
					utils.pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			}

			const water_cooler_switch_device = await connection.getDevice(WATER_COOLER_DEVICEID);
			if (water_cooler_switch_device.online && water_cooler_switch_device.params.switch == "on") {
				const status = await connection.toggleDevice(WATER_COOLER_DEVICEID);
				console.log("Toggle WATER_COOLER_DEVICEID", status);
				notificationMessage += (notificationMessage != "" ? ", " : "") + "Water cooler off";
			}

			const ups_input_device = await connection.getDevice(UPS_INPUT_DEVICEID);
			if (ups_input_device.online && enableUpsOnGenerator == 0) {
				const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
				if (ups_output_device.online && (ups_input_device.params.switch == "on" || ups_output_device.params.switch == "on")) {
					/*
					if (upsInputOnGeneratorCount != null && upsInputOnGeneratorCount == 3) {
						redisUpdate.upsInputOnGeneratorCount = "0";
						utils.pushoverNotification("Nabih-iPhone", 'UPS is charging on generator', 'Electicity Update', 'pushover');
					} else if (upsInputOnGeneratorCount != null) {
						let tmpVal = upsInputOnGeneratorCount + 1;
						redisUpdate.upsInputOnGeneratorCount = tmpVal.toString();
					} else {
						redisUpdate.upsInputOnGeneratorCount = "1";
					}
					*/
					if (ups_input_device.params.switch == "on") {
						await connection.toggleDevice(UPS_INPUT_DEVICEID);
						await utils.sleep(2000);
					}
					if (ups_output_device.params.switch == "on")
						await connection.toggleDevice(UPS_OUTPUT_DEVICEID);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Stopping UPS charging on electricity";
				} else if (ups_input_device.online && !ups_output_device.online && upsDischargedAt == 0) {
					redisUpdate.upsDischargedAt = nowTime.getTime().toString();
					notificationMessage += (notificationMessage != "" ? ", " : "") + "UPS Discharged";
				}
			}
			if (notificationMessage != "") {
				utils.pushoverNotification("Nabih-iPhone", notificationMessage, 'Electicity Update', 'gamelan');
			}
		} else if (!electricity_device.online && !ups_input_device.online && !four_ch_pro_r3_device.online) {
			responseJson.online = false;
			const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
			locationString = water_pump_switch_device.online ? "at home" : "in the building";
			console.log("No electricity or network " + locationString);
			if (offlineOrNoElectricityCount != null && parseInt(offlineOrNoElectricityCount) == 6) {
				redisUpdate.offlineOrNoElectricityCount = "0";
				console.log("No electricity or network for 30 minutes " + locationString);
				utils.pushoverNotification("Nabih-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
				utils.pushoverNotification("Rohan-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
			} else if (offlineOrNoElectricityCount != null) {
				let tmpVal = parseInt(offlineOrNoElectricityCount) + 1;
				redisUpdate.offlineOrNoElectricityCount = tmpVal.toString();
			} else {
				redisUpdate.offlineOrNoElectricityCount = "1";
			}
		}

		if (Object.keys(redisUpdate).length > 0) {
			await redisClient.connect();
			for (const [key, value] of Object.entries(redisUpdate)) {
				/*
				const putParams = {TableName: 'ewelink', Item: {id: { S: key }, state: { N: value }}};
				dynamodb.putItem(putParams, (err) => {if (err) {console.error('Error writing item:', err);}});
				*/
				console.log("Set redis key: " + key, value);
  				await redisClient.set(key, value);
			}
			await redisClient.quit();
		}

		console.log("Script done!")
		responseJson.status = "success";
	} else {
		console.log("Script disabled!")
		responseJson.status = "disabled";
	}
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
	return;
});

app.listen(process.env.PORT || 3000)
