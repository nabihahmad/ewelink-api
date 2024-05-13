express = require('express');
app = express();
app.use(express.json())
require('dotenv').config();
ewelink = require('ewelink-api');
atob = require("atob");
require('./utils.js');
require('./config.js');

require('./config-endpoints.js')

app.post('/ewelink', async (req, res) => {
	let responseJson = {};
	let dynamoDBUpdate = {};
	if (process.env.DISABLE_SCRIPT == "false") {
		var beirutTimezone = (new Date()).getTime() + (120 * 60000);
		const nowTime = new Date(beirutTimezone);
		let hourOfDay = nowTime.getHours();
		// let dayOfWeek = nowTime.getDay();

		let enableHeaterOnGenerator = "0";
		const getEnableHeaterOnGeneratorParams = {TableName: 'ewelink', Key: {id: {S: 'enableHeaterOnGenerator'}}};
		const getEnableHeaterOnGeneratorData = await dynamodb.getItem(getEnableHeaterOnGeneratorParams).promise();
		enableHeaterOnGenerator = getEnableHeaterOnGeneratorData.Item.state.N;

		let enableWaterPumpOnGenerator = "0";
		const getEnableWaterPumpOnGeneratorParams = {TableName: 'ewelink', Key: {id: {S: 'enableWaterPumpOnGenerator'}}};
		const getEnableWaterPumpOnGeneratorData = await dynamodb.getItem(getEnableWaterPumpOnGeneratorParams).promise();
		enableWaterPumpOnGenerator = getEnableWaterPumpOnGeneratorData.Item.state.N;
		
		let enableWaterPumpOnElectricity = "0";
		const getEnableWaterPumpOnElectricityParams = {TableName: 'ewelink', Key: {id: {S: 'enableWaterPumpOnElectricity'}}};
		const getEnableWaterPumpOnElectricityData = await dynamodb.getItem(getEnableWaterPumpOnElectricityParams).promise();
		enableWaterPumpOnElectricity = getEnableWaterPumpOnElectricityData.Item.state.N;

		let enableUpsOnGenerator = "0";
		const getEnableUpsOnGeneratorParams = {TableName: 'ewelink', Key: {id: {S: 'enableUpsOnGenerator'}}};
		const getEnableUpsOnGeneratorData = await dynamodb.getItem(getEnableUpsOnGeneratorParams).promise();
		enableUpsOnGenerator = getEnableUpsOnGeneratorData.Item.state.N;

		let lastState = "0";
		const getLastStateParams = {TableName: 'ewelink', Key: {id: {S: 'lastState'}}};
		const getLastStateData = await dynamodb.getItem(getLastStateParams).promise();
		lastState = getLastStateData.Item.state.N;

		let offlineOrNoElectricityCount = "0";
		const getOfflineOrNoElectricityCountParams = {TableName: 'ewelink', Key: {id: {S: 'offlineOrNoElectricityCount'}}};
		const getOfflineOrNoElectricityCountData = await dynamodb.getItem(getOfflineOrNoElectricityCountParams).promise();
		offlineOrNoElectricityCount = getOfflineOrNoElectricityCountData.Item.state.N;

		let lastRunAt = null;
		const getLastRunAtParams = {TableName: 'ewelink', Key: {id: {S: 'lastRunAt'}}};
		const getLastRunAtData = await dynamodb.getItem(getLastRunAtParams).promise();
		lastRunAt = getLastRunAtData.Item.state.N;

		let diffMs = 0, diffMins = 0;
		if (lastRunAt != null) {
			diffMs = (nowTime - lastRunAt); // milliseconds between now & lastRunAt
			diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
			if (diffMins > 10) {
				pushoverNotification("Nabih-iPhone", "Inoperative: scheduler not working " + diffMins + ", " + lastRunAt + ", " + nowTime, 'Electicity Update', 'siren');
			}
		}
		console.log("Schedule status:", lastRunAt, nowTime.getTime(), diffMs, diffMins);
		const putLastRunAtParams = {TableName: 'ewelink', Item: {id: { S: 'lastRunAt' }, state: { N: nowTime.getTime().toString() }}};
		dynamodb.putItem(putLastRunAtParams, (err) => {if (err) {console.error('Error writing lastRunAt:', err);}});

		// let upsInputOnGeneratorCount = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.upsInputOnGeneratorCount != null ? electricityConfig.props.upsInputOnGeneratorCount : 0;
		// let upsInputOnElectricityCount = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.upsInputOnElectricityCount != null ? electricityConfig.props.upsInputOnElectricityCount : 0;

		console.log("Running mode:", hourOfDay, enableHeaterOnGenerator, enableWaterPumpOnGenerator, enableWaterPumpOnElectricity, enableUpsOnGenerator, lastState, offlineOrNoElectricityCount);

		let connection = new ewelink({
			email: process.env.EWELINK_EMAIL,
			password: atob.atob(process.env.EWELINK_PASSWORD),
			APP_ID: process.env.EWELINK_APP_ID,
			APP_SECRET: process.env.EWELINK_APP_SECRET,
		});
		let electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
		if (electricity_device.error == 406) {
			connection = new ewelink({
				email: process.env.EWELINK_EMAIL,
				password: atob.atob(process.env.EWELINK_PASSWORD),
				region: 'us',
			});
			electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
			if (electricity_device.error == 406) {
				connection = new ewelink({
					email: process.env.EWELINK_EMAIL,
					password: atob.atob(process.env.EWELINK_PASSWORD),
					region: 'eu',
				});
				electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
				if (electricity_device.error == 406) {
					pushoverNotification('Nabih-iPhone', 'inoperative: authentication failed', 'ERROR', 'none');
					responseJson.status = "failed";
					res.setHeader('Content-Type', 'application/json');
					res.send(JSON.stringify(responseJson));
				}
			}
		}
		const four_ch_pro_device = await connection.getDevice(FOUR_CH_PRO_DEVICEID);
		const four_ch_pro_r3_device = await connection.getDevice(FOUR_CH_PROR3_DEVICEID);
		const ups_input_device = await connection.getDevice(UPS_INPUT_DEVICEID);

		if (four_ch_pro_device.online && four_ch_pro_device.params.switches[2].switch == "on") {
			const status = await connection.toggleDevice(FOUR_CH_PRO_DEVICEID, 3);
			console.log("Status FOUR_CH_PRO_DEVICEID", status);
			responseJson.ch4_pro_toggled = true;
		} else
			responseJson.ch4_pro_toggled = false;

		if (electricity_device.online) {
			responseJson.online = true;
			responseJson.electricity = true;
			iftttMessage = "";
			console.log("Electricity");
			if (lastState == 0) {
				console.log("logElectricity 1 for state", lastState);
				dynamoDBUpdate.lastState = "1";
				iftttMessage = "Electricity is on";
				pushoverNotification('Rohan-iPhone', iftttMessage, 'Electricity Info', 'pushover');
				pushoverNotification("Asmahan-iPhone", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				pushoverNotification("Ahmad-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				pushoverNotification("Amir-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
			}
			dynamoDBUpdate.offlineOrNoElectricityCount = "0";

			if(electricity_device.params.switch == "on") {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline");
				if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "off") {
					// if (dayOfWeek != 5 && dayOfWeek != 6) {
						if (process.env.AUTOMATED_HEATER != null && process.env.AUTOMATED_HEATER == "main") {
							const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
							console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
						} else {
							const status = await connection.toggleDevice(POWER_MEASURING_DUALR3_DEVICEID, DUALR3_HEATER_SWITCH);
							console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
						}
					// }

					// if (dayOfWeek != 0 && dayOfWeek != 5 && dayOfWeek != 6 && process.env.START_4CH_PRO_CHANNEL != null && process.env.START_4CH_PRO_CHANNEL != "") { // TODO: replace with a DB toggle
					if (false && process.env.START_4CH_PRO_CHANNEL != null && process.env.START_4CH_PRO_CHANNEL != "") { // TODO: replace with a DB toggle
						try {
							startChannel = parseInt(process.env.START_4CH_PRO_CHANNEL);
							if (four_ch_pro_device.online && four_ch_pro_device.params.switches[startChannel-1].switch == "off") {
								const statusChannel = await connection.toggleDevice(FOUR_CH_PRO_DEVICEID, startChannel);
								console.log("Toggle FOUR_CH_PRO_DEVICEID", statusChannel);
							}
						} catch (e) {}
					}
				}
			}

			if (enableWaterPumpOnElectricity == 0) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					pushoverNotification("Nabih-iPhone", "Water pump off", 'Electicity Update', 'bike');
					pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			}

			const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
			if (ups_input_device.online && ups_output_device.online && (ups_input_device.params.switch == "off" || ups_output_device.params.switch == "off")) {
				/*
				if (upsInputOnElectricityCount != null && upsInputOnElectricityCount == 3) {
					dynamoDBUpdate.upsInputOnElectricityCount = "0";
					pushoverNotification('Nabih-iPhone', 'Charge UPS on electricity', 'Electricity Info', 'pushover');
				} else if (upsInputOnElectricityCount != null) {
					let tmpVal = upsInputOnElectricityCount + 1;
					dynamoDBUpdate.upsInputOnElectricityCount = tmpVal.toString();
				} else {
					dynamoDBUpdate.upsInputOnElectricityCount = "1";
				}
				*/
				if (ups_output_device.params.switch == "off") {
					await connection.toggleDevice(UPS_OUTPUT_DEVICEID);
					await sleep(2000);
				}
				if (ups_input_device.params.switch == "off")
					await connection.toggleDevice(UPS_INPUT_DEVICEID);
				iftttMessage += (iftttMessage != "" ? ": " : "") + "Charging UPS on electricity";
			}
			if (iftttMessage != "") {
				pushoverNotification("Nabih-iPhone", iftttMessage, 'Electicity Update', 'pushover');
			}
		} else if (!electricity_device.online && ups_input_device.online && four_ch_pro_r3_device.online) {
			responseJson.online = true;
			responseJson.electricity = false;
			iftttMessage = "";
			dynamoDBUpdate.offlineOrNoElectricityCount = "0";
			console.log("No electricity");
			if (lastState == 1) {
				console.log("logElectricity 0 for state", lastState);
				dynamoDBUpdate.lastState = "0";
				iftttMessage = "Electricity is off";
				pushoverNotification("Rohan-iPhone", iftttMessage, 'Electicity Update', 'gamelan');
				pushoverNotification("Asmahan-iPhone", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				pushoverNotification("Ahmad-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				pushoverNotification("Amir-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
			}

			if (enableHeaterOnGenerator == 0) {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.online ? power_measuring_switch_device.params.switch : "offline");
				if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
					console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
				}

				const power_measuring_dualr3_device = await connection.getDevice(POWER_MEASURING_DUALR3_DEVICEID);
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
					pushoverNotification("Nabih-iPhone", "Water pump off", 'Electicity Update', 'bike');
					pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			} else if (enableWaterPumpOnGenerator == 1) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.online ? water_pump_switch_device.params.switch : "offline");
				if (((hourOfDay >= 0 && hourOfDay <= 2) || (hourOfDay >= 5 && hourOfDay <= 6) || (hourOfDay >= 9 && hourOfDay <= 11)) && water_pump_switch_device.online && water_pump_switch_device.params.switch == "off") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					pushoverNotification("Nabih-iPhone", "Water pump on", 'Electicity Update', 'bike');
					pushoverNotification("Amir-Android", "تشغيل طرمبة الماء", "حالة الكهرباء", 'bike');
				} else if ((hourOfDay < 0 || (hourOfDay > 2 && hourOfDay < 5) || (hourOfDay > 6 && hourOfDay < 9) || hourOfDay > 11) && water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
					pushoverNotification("Nabih-iPhone", "Water pump off", 'Electicity Update', 'bike');
					pushoverNotification("Amir-Android", "إطفاء طرمبة الماء", "حالة الكهرباء", 'bike');
				}
			}

			const ups_input_device = await connection.getDevice(UPS_INPUT_DEVICEID);
			if (ups_input_device.online && !enableUpsOnGenerator) {
				const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
				if (ups_output_device.online && (ups_input_device.params.switch == "on" || ups_output_device.params.switch == "on")) {
					/*
					if (upsInputOnGeneratorCount != null && upsInputOnGeneratorCount == 3) {
						dynamoDBUpdate.upsInputOnGeneratorCount = "0";
						pushoverNotification("Nabih-iPhone", 'UPS is charging on generator', 'Electicity Update', 'pushover');
					} else if (upsInputOnGeneratorCount != null) {
						let tmpVal = upsInputOnGeneratorCount + 1;
						dynamoDBUpdate.upsInputOnGeneratorCount = tmpVal.toString();
					} else {
						dynamoDBUpdate.upsInputOnGeneratorCount = "1";
					}
					*/
					if (ups_input_device.params.switch == "on") {
						await connection.toggleDevice(UPS_INPUT_DEVICEID);
						await sleep(2000);
					}
					if (ups_output_device.params.switch == "on")
						await connection.toggleDevice(UPS_OUTPUT_DEVICEID);
					iftttMessage += (iftttMessage != "" ? ": " : "") + "Stopping UPS charging on electricity";
				}
			}
			if (iftttMessage != "") {
				pushoverNotification("Nabih-iPhone", iftttMessage, 'Electicity Update', 'gamelan');
			}
		} else if (!electricity_device.online && !ups_input_device.online && !four_ch_pro_r3_device.online) {
			responseJson.online = false;
			const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
			locationString = water_pump_switch_device.online ? "at home" : "in the building";
			console.log("No electricity or network " + locationString);
			if (offlineOrNoElectricityCount != null && parseInt(offlineOrNoElectricityCount) == 6) {
				dynamoDBUpdate.offlineOrNoElectricityCount = "0";
				console.log("No electricity or network for 30 minutes " + locationString);
				pushoverNotification("Nabih-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
				pushoverNotification("Rohan-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
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
