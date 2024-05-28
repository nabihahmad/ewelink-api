express = require('express');
app = express();
app.use(express.json())
require('dotenv').config();
ewelink = require('ewelink-api');
atob = require("atob");
const utils = require('./utils.js');
require('./config/config.js');
require('./config/endpoints.js')

app.post('/ewelink', async (req, res) => {
	let responseJson = {};
	let dynamoDBUpdate = {};
	if (process.env.DISABLE_SCRIPT == "false") {
		var beirutTimezone = (new Date()).getTime() + (120 * 60000);
		const nowTime = new Date(beirutTimezone);
		let hourOfDay = nowTime.getHours();
		// let dayOfWeek = nowTime.getDay();

		let enableHeaterOnGenerator = await utils.getDynamoDBConfigParam('enableHeaterOnGenerator');
		let enableWaterPumpOnGenerator = await utils.getDynamoDBConfigParam('enableWaterPumpOnGenerator');
		let enableWaterPumpOnElectricity = await utils.getDynamoDBConfigParam('enableWaterPumpOnElectricity');
		let enableUpsOnGenerator = await utils.getDynamoDBConfigParam('enableUpsOnGenerator');
		let lastState = await utils.getDynamoDBConfigParam('lastState');
		let offlineOrNoElectricityCount = await utils.getDynamoDBConfigParam('offlineOrNoElectricityCount');
		let lastRunAt = await utils.getDynamoDBConfigParam('lastRunAt');
		// let upsInputOnGeneratorCount = await utils.getDynamoDBConfigParam('upsInputOnGeneratorCount');
		// let upsInputOnElectricityCount = await utils.getDynamoDBConfigParam('upsInputOnElectricityCount');

		let diffMs = 0, diffMins = 0;
		if (lastRunAt != null) {
			diffMs = (nowTime - lastRunAt); // milliseconds between now & lastRunAt
			diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
			if (diffMins > 10) {
				utils.pushoverNotification("Nabih-iPhone", "Inoperative: scheduler not working " + diffMins + ", " + lastRunAt + ", " + nowTime, 'Electicity Update', 'siren');
			}
		}
		console.log("Schedule status:", lastRunAt, nowTime.getTime(), diffMs, diffMins);
		const putLastRunAtParams = {TableName: 'ewelink', Item: {id: { S: 'lastRunAt' }, state: { N: nowTime.getTime().toString() }}};
		dynamodb.putItem(putLastRunAtParams, (err) => {if (err) {console.error('Error writing lastRunAt:', err);}});

		let loginMethod = utils.getEmailDomain(process.env.EWELINK_EMAIL) + " + appId + secret";
		let connection = new ewelink({
			email: process.env.EWELINK_EMAIL,
			password: atob.atob(process.env.EWELINK_PASSWORD),
			APP_ID: process.env.EWELINK_APP_ID,
			APP_SECRET: process.env.EWELINK_APP_SECRET,
		});
		let electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
		if (electricity_device.error == 406) {
			loginMethod = utils.getEmailDomain(process.env.EWELINK_EMAIL) + " + region us";
			connection = new ewelink({
				email: process.env.EWELINK_EMAIL,
				password: atob.atob(process.env.EWELINK_PASSWORD),
				region: 'us',
			});
			electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
			if (electricity_device.error == 406) {
				loginMethod = utils.getEmailDomain(process.env.EWELINK_EMAIL) + " + region eu";
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
				dynamoDBUpdate.lastState = "1";
				notificationMessage = "Electricity is on";
				utils.pushoverNotification('Rohan-iPhone', notificationMessage, 'Electricity Info', 'pushover');
				utils.pushoverNotification("Asmahan-iPhone", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				utils.pushoverNotification("Ahmad-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				utils.pushoverNotification("Amir-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
			}
			dynamoDBUpdate.offlineOrNoElectricityCount = "0";

			if(electricity_device.params.switch == "on") {
				// if (dayOfWeek != 5 && dayOfWeek != 6) {
					if (process.env.AUTOMATED_HEATER != null && process.env.AUTOMATED_HEATER == "main") {
						const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
						console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline");
						if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "off") {
							const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
							console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
						}
					} else if (process.env.AUTOMATED_HEATER != null && process.env.AUTOMATED_HEATER == "kitchen") {
						const power_measuring_dualr3_device = await connection.getDevice(POWER_MEASURING_DUALR3_DEVICEID);
						console.log("Switch POWER_MEASURING_DUALR3_DEVICEID", power_measuring_dualr3_device.online ? power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch : "offline");
						if (power_measuring_dualr3_device.online && power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch == "off") {
							const status = await connection.toggleDevice(POWER_MEASURING_DUALR3_DEVICEID, DUALR3_HEATER_SWITCH);
							console.log("Toggle POWER_MEASURING_DUALR3_DEVICEID channel " + DUALR3_HEATER_SWITCH, status);
						}
					}
				// }
				
				/*
				if (dayOfWeek != 0 && dayOfWeek != 5 && dayOfWeek != 6 && process.env.START_4CH_PRO_CHANNEL != null && process.env.START_4CH_PRO_CHANNEL != "") { // TODO: replace with a DB toggle
					if (process.env.START_4CH_PRO_CHANNEL != null && process.env.START_4CH_PRO_CHANNEL != "") { // TODO: replace with a DB toggle
						try {
							startChannel = parseInt(process.env.START_4CH_PRO_CHANNEL);
							if (four_ch_pro_device.online && four_ch_pro_device.params.switches[startChannel-1].switch == "off") {
								const statusChannel = await connection.toggleDevice(FOUR_CH_PRO_DEVICEID, startChannel);
								console.log("Toggle FOUR_CH_PRO_DEVICEID", statusChannel);
							}
						} catch (e) {}
					}
				}
				*/
			}

			if (enableWaterPumpOnElectricity == 0) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump off";
					utils.pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			}

			if (hourOfDay >= 7) {
				const water_cooler_switch_device = await connection.getDevice(WATER_COOLER_DEVICEID);
				if (water_cooler_switch_device.online && water_cooler_switch_device.params.switch == "off") {
					const status = await connection.toggleDevice(WATER_COOLER_DEVICEID);
					console.log("Toggle WATER_COOLER_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water cooler on";
				}
			}

			const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
			if (ups_input_device.online && ups_output_device.online && (ups_input_device.params.switch == "off" || ups_output_device.params.switch == "off")) {
				/*
				if (upsInputOnElectricityCount != null && upsInputOnElectricityCount == 3) {
					dynamoDBUpdate.upsInputOnElectricityCount = "0";
					utils.pushoverNotification('Nabih-iPhone', 'Charge UPS on electricity', 'Electricity Info', 'pushover');
				} else if (upsInputOnElectricityCount != null) {
					let tmpVal = upsInputOnElectricityCount + 1;
					dynamoDBUpdate.upsInputOnElectricityCount = tmpVal.toString();
				} else {
					dynamoDBUpdate.upsInputOnElectricityCount = "1";
				}
				*/
				if (ups_output_device.params.switch == "off") {
					await connection.toggleDevice(UPS_OUTPUT_DEVICEID);
					await utils.sleep(2000);
				}
				if (ups_input_device.params.switch == "off")
					await connection.toggleDevice(UPS_INPUT_DEVICEID);
				notificationMessage += (notificationMessage != "" ? ", " : "") + "Charging UPS on electricity";
			}
			if (notificationMessage != "") {
				utils.pushoverNotification("Nabih-iPhone", notificationMessage, 'Electicity Update', 'pushover');
			}
		} else if (!electricity_device.online && ups_input_device.online && four_ch_pro_r3_device.online) {
			responseJson.online = true;
			responseJson.electricity = false;
			notificationMessage = "";
			dynamoDBUpdate.offlineOrNoElectricityCount = "0";
			console.log("No electricity");
			if (lastState == 1) {
				console.log("logElectricity 0 for state", lastState);
				dynamoDBUpdate.lastState = "0";
				notificationMessage = "Electricity is off";
				utils.pushoverNotification("Rohan-iPhone", notificationMessage, 'Electicity Update', 'gamelan');
				utils.pushoverNotification("Asmahan-iPhone", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				utils.pushoverNotification("Ahmad-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				utils.pushoverNotification("Amir-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
			}

			if (enableHeaterOnGenerator == 0) {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				// console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline");
				if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
					console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
				}

				const power_measuring_dualr3_device = await connection.getDevice(POWER_MEASURING_DUALR3_DEVICEID);
				// console.log("Switch POWER_MEASURING_DUALR3_DEVICEID", power_measuring_dualr3_device.online ? power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch : "offline");
				if (power_measuring_dualr3_device.online && power_measuring_dualr3_device.params.switches[DUALR3_HEATER_SWITCH - 1].switch == "on") {
					const status = await connection.toggleDevice(POWER_MEASURING_DUALR3_DEVICEID, DUALR3_HEATER_SWITCH);
					console.log("Toggle POWER_MEASURING_DUALR3_DEVICEID channel " + DUALR3_HEATER_SWITCH, status);
				}
			}

			if (enableWaterPumpOnGenerator == 0 && (hourOfDay < 4 || hourOfDay > 6) && (hourOfDay < 10 || hourOfDay > 12)) {
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
				if (((hourOfDay >= 0 && hourOfDay <= 2) || (hourOfDay >= 5 && hourOfDay <= 6) || (hourOfDay >= 9 && hourOfDay <= 11)) && water_pump_switch_device.online && water_pump_switch_device.params.switch == "off") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Water pump on";
					utils.pushoverNotification("Amir-Android", "تشغيل طرمبة الماء", "حالة الكهرباء", 'bike');
				} else if ((hourOfDay < 0 || (hourOfDay > 2 && hourOfDay < 5) || (hourOfDay > 6 && hourOfDay < 9) || hourOfDay > 11) && water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
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
						dynamoDBUpdate.upsInputOnGeneratorCount = "0";
						utils.pushoverNotification("Nabih-iPhone", 'UPS is charging on generator', 'Electicity Update', 'pushover');
					} else if (upsInputOnGeneratorCount != null) {
						let tmpVal = upsInputOnGeneratorCount + 1;
						dynamoDBUpdate.upsInputOnGeneratorCount = tmpVal.toString();
					} else {
						dynamoDBUpdate.upsInputOnGeneratorCount = "1";
					}
					*/
					if (ups_input_device.params.switch == "on") {
						await connection.toggleDevice(UPS_INPUT_DEVICEID);
						await utils.sleep(2000);
					}
					if (ups_output_device.params.switch == "on")
						await connection.toggleDevice(UPS_OUTPUT_DEVICEID);
					notificationMessage += (notificationMessage != "" ? ", " : "") + "Stopping UPS charging on electricity";
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
				dynamoDBUpdate.offlineOrNoElectricityCount = "0";
				console.log("No electricity or network for 30 minutes " + locationString);
				utils.pushoverNotification("Nabih-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
				utils.pushoverNotification("Rohan-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
			} else if (offlineOrNoElectricityCount != null) {
				let tmpVal = parseInt(offlineOrNoElectricityCount) + 1;
				dynamoDBUpdate.offlineOrNoElectricityCount = tmpVal.toString();
			} else {
				dynamoDBUpdate.offlineOrNoElectricityCount = "1";
			}
		}

		if (Object.keys(dynamoDBUpdate).length > 0) {
			for (const [key, value] of Object.entries(dynamoDBUpdate)) {
				const putParams = {TableName: 'ewelink', Item: {id: { S: key }, state: { N: value }}};
				dynamodb.putItem(putParams, (err) => {if (err) {console.error('Error writing item:', err);}});
			}
		}

		console.log("Script done!")
		responseJson.status = "success";
	} else {
		console.log("Script disabled!")
		responseJson.status = "disabled";
	}
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.listen(process.env.PORT || 3000)
