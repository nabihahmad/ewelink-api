const express = require('express');
const app = express();
app.use(express.json())
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

DUALR3_HEATER_SWITCH = 2;

app.post('/ewelink', async (req, res) => {
	let responseJson = {};
	let electricityDBUpdate = {};
	if (process.env.DISABLE_SCRIPT == "false") {
		var beirutTimezone = (new Date()).getTime() + (120 * 60000);
		const nowTime = new Date(beirutTimezone);
		let hourOfDay = nowTime.getHours();
		// let dayOfWeek = nowTime.getDay();

		let electricityConfig = await electricityDB.get("config");

		let enableHeaterOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableHeaterOnGenerator != null ? electricityConfig.props.enableHeaterOnGenerator : 0;

		let enableWaterPumpOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnGenerator != null ? electricityConfig.props.enableWaterPumpOnGenerator : 0;
		let enableWaterPumpOnElectricity = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnElectricity != null ? electricityConfig.props.enableWaterPumpOnElectricity : 0;

		let enableUpsOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableUpsOnGenerator != null ? electricityConfig.props.enableUpsOnGenerator : 0;

		let lastState = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.lastState != null ? electricityConfig.props.lastState : 0;

		let offlineOrNoElectricityCount = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.offlineOrNoElectricityCount != null ? electricityConfig.props.offlineOrNoElectricityCount : 0;

		let electricityStatus = await electricityDB.get("status");
		let lastRunAt = electricityStatus != null && electricityStatus.props != null && electricityStatus.props.lastRunAt != null ? electricityStatus.props.lastRunAt : null;
		let diffMs = 0, diffMins = 0;
		if (lastRunAt != null) {
			diffMs = (nowTime - lastRunAt); // milliseconds between now & lastRunAt
			diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
			if (diffMins > 10) {
				pushoverNotification("Nabih-iPhone", "Inoperative: scheduler not working " + diffMins + ", " + lastRunAt + ", " + nowTime, 'Electicity Update', 'siren');
				// iftttWebhook({message: "Inoperative: scheduler not working " + diffMins + ", " + lastRunAt + ", " + nowTime}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
			}
		}
		console.log("Schedule status:", lastRunAt, nowTime.getTime(), diffMs, diffMins);
		await electricityDB.set("status", {"lastRunAt": nowTime.getTime()});

		// let upsInputOnGeneratorCount = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.upsInputOnGeneratorCount != null ? electricityConfig.props.upsInputOnGeneratorCount : 0;
		// let upsInputOnElectricityCount = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.upsInputOnElectricityCount != null ? electricityConfig.props.upsInputOnElectricityCount : 0;

		console.log("Running mode:", enableHeaterOnGenerator, enableWaterPumpOnGenerator, enableWaterPumpOnElectricity, enableUpsOnGenerator, lastState, offlineOrNoElectricityCount);

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
					// iftttWebhook({message: "Inoperative: authentication failed"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
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
				electricityDBUpdate.lastState = 1;
				iftttMessage = "Electricity is on";
				pushoverNotification('Rohan-iPhone', iftttMessage, 'Electricity Info', 'pushover');
				pushoverNotification("Asmahan-iPhone", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				pushoverNotification("Ahmad-Android", "كهرباء الدولة متوفرة", "حالة الكهرباء", 'pushover');
				// iftttWebhook({message: "Electricity is on"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
				// iftttWebhook({message: "كهرباء الدولة متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_DAD);
				// iftttWebhook({message: "كهرباء الدولة متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_MOM);
			}
			electricityDBUpdate.offlineOrNoElectricityCount = 0;

			if(electricity_device.params.switch == "on") {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.params.switch);
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

			const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
			if (enableWaterPumpOnElectricity == 1) {
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.params.switch);
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "off") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
				}
			} else {
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.params.switch);
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
				}
			}

			const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
			if (ups_input_device.online && ups_output_device.online && (ups_input_device.params.switch == "off" || ups_output_device.params.switch == "off")) {
				/*
				if (upsInputOnElectricityCount != null && upsInputOnElectricityCount == 3) {
					electricityDBUpdate.upsInputOnElectricityCount = 0;
					pushoverNotification('Nabih-iPhone', 'Charge UPS on electricity', 'Electricity Info', 'pushover');
					// iftttWebhook({message: "Charge UPS on electricity"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
				} else if (upsInputOnElectricityCount != null)
					electricityDBUpdate.upsInputOnElectricityCount = upsInputOnElectricityCount + 1;
				else
					electricityDBUpdate.upsInputOnElectricityCount = 1;
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
				// iftttWebhook({message: iftttMessage}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
			}
		} else if (!electricity_device.online && ups_input_device.online && four_ch_pro_r3_device.online) {
			responseJson.online = true;
			responseJson.electricity = false;
			iftttMessage = "";
			electricityDBUpdate.offlineOrNoElectricityCount = 0;
			console.log("No electricity");
			if (lastState == 1) {
				console.log("logElectricity 0 for state", lastState);
				electricityDBUpdate.lastState = 0;
				iftttMessage = "Electricity is off";
				pushoverNotification("Rohan-iPhone", iftttMessage, 'Electicity Update', 'gamelan');
				pushoverNotification("Asmahan-iPhone", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				pushoverNotification("Ahmad-Android", "كهرباء الدولة غير متوفرة", "حالة الكهرباء", 'gamelan');
				// iftttWebhook({message: "Electricity is off"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
				// iftttWebhook({message: "كهرباء الدولة غير متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_DAD);
				// iftttWebhook({message: "كهرباء الدولة غير متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_MOM);
			}

			if (enableHeaterOnGenerator == 0) {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.params.switch);
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

			if (enableWaterPumpOnGenerator == 0)
				console.log("disable water pump on generator, current hour", hourOfDay, ((hourOfDay < 4 || hourOfDay > 6) && (hourOfDay < 10 || hourOfDay > 12)));
			if (enableWaterPumpOnGenerator == 0 && (hourOfDay < 4 || hourOfDay > 6) && (hourOfDay < 10 || hourOfDay > 12)) {
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.params.switch);
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
				}
			} else if (enableWaterPumpOnGenerator == 1 && (hourOfDay >= 1 || hourOfDay <= 9)) {
				const building_entrance_interior_lighting_device = await connection.getDevice(BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID);
				const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
				console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.params.switch);
				if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "off" && building_entrance_interior_lighting_device && building_entrance_interior_lighting_device.switch == "off") {
					const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
					console.log("Toggle WATER_PUMP_DEVICEID", status);
				}
			}

			const ups_input_device = await connection.getDevice(UPS_INPUT_DEVICEID);
			if (ups_input_device.online && !enableUpsOnGenerator) {
				const ups_output_device = await connection.getDevice(UPS_OUTPUT_DEVICEID);
				if (ups_output_device.online && (ups_input_device.params.switch == "on" || ups_output_device.params.switch == "on")) {
					/*
					if (upsInputOnGeneratorCount != null && upsInputOnGeneratorCount == 3) {
						electricityDBUpdate.upsInputOnGeneratorCount = 0;
						pushoverNotification("Nabih-iPhone", 'UPS is charging on generator', 'Electicity Update', 'pushover');
						// iftttWebhook({message: "UPS is charging on generator"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
					} else if (upsInputOnGeneratorCount != null)
						electricityDBUpdate.upsInputOnGeneratorCount = upsInputOnGeneratorCount + 1;
					else
						electricityDBUpdate.upsInputOnGeneratorCount = 1;
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
				// iftttWebhook({message: iftttMessage}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
			}
		} else if (!electricity_device.online && !ups_input_device.online && !four_ch_pro_r3_device.online) {
			responseJson.online = false;
			const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
			locationString = water_pump_switch_device.online ? "at home" : "in the building";
			console.log("No electricity or network " + locationString);
			if (offlineOrNoElectricityCount != null && offlineOrNoElectricityCount == 6) {
				electricityDBUpdate.offlineOrNoElectricityCount = 0;
				console.log("No electricity or network for 30 minutes " + locationString);
				pushoverNotification("Nabih-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
				pushoverNotification("Rohan-iPhone", "No electricity or network for 30 minutes " + locationString, 'Electicity Update', 'vibrate');
				// iftttWebhook({message: "No electricity or network for 30 minutes " + locationString}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
				// iftttWebhook({message: "No electricity or network for 30 minutes " + locationString}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
			} else if (offlineOrNoElectricityCount != null)
				electricityDBUpdate.offlineOrNoElectricityCount = offlineOrNoElectricityCount + 1;
			else
				electricityDBUpdate.offlineOrNoElectricityCount = 1;
		}

		if (Object.keys(electricityDBUpdate).length > 0)
			await electricityDB.set("config", electricityDBUpdate);

		console.log("Script done!")
		responseJson.status = "success";
	} else {
		console.log("Script disabled!")
		responseJson.status = "disabled";
	}
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleHeaterOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableHeaterOnGenerator = requestBody.enableHeaterOnGenerator != null ? parseInt(requestBody.enableHeaterOnGenerator) : 0;
	console.log("enableHeaterOnGenerator", enableHeaterOnGenerator);

	await electricityDB.set("config", {"enableHeaterOnGenerator": enableHeaterOnGenerator});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleHeaterOnGenerator', async (req, res) => {
	let responseJson = {};

	let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	responseJson.enableHeaterOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableHeaterOnGenerator != null ? electricityConfig.props.enableHeaterOnGenerator : 0;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleWaterPumpOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableWaterPumpOnGenerator = requestBody.enableWaterPumpOnGenerator != null ? parseInt(requestBody.enableWaterPumpOnGenerator) : 0;
	console.log("enableWaterPumpOnGenerator", enableWaterPumpOnGenerator);

	await electricityDB.set("config", {"enableWaterPumpOnGenerator": enableWaterPumpOnGenerator});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleWaterPumpOnGenerator', async (req, res) => {
	let responseJson = {};

	let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	responseJson.enableWaterPumpOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnGenerator != null ? electricityConfig.props.enableWaterPumpOnGenerator : 0;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleWaterPumpOnElectricity', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableWaterPumpOnElectricity = requestBody.enableWaterPumpOnElectricity != null ? parseInt(requestBody.enableWaterPumpOnElectricity) : 0;
	console.log("enableWaterPumpOnElectricity", enableWaterPumpOnElectricity);

	await electricityDB.set("config", {"enableWaterPumpOnElectricity": enableWaterPumpOnElectricity});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleWaterPumpOnElectricity', async (req, res) => {
	let responseJson = {};

	let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	responseJson.enableWaterPumpOnElectricity = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnElectricity != null ? electricityConfig.props.enableWaterPumpOnElectricity : 0;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleUpsOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableUpsOnGenerator = requestBody.enableUpsOnGenerator != null ? parseInt(requestBody.enableUpsOnGenerator) : 0;
	console.log("enableUpsOnGenerator", enableUpsOnGenerator);

	await electricityDB.set("config", {"enableUpsOnGenerator": enableUpsOnGenerator});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleUpsOnGenerator', async (req, res) => {
	let responseJson = {};

	let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	responseJson.enableUpsOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableUpsOnGenerator != null ? electricityConfig.props.enableUpsOnGenerator : 0;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.listen(process.env.PORT || 3000)

function iftttWebhook(jsonData, event, webhookKey) {
	const data = JSON.stringify(jsonData);

	const postOptions = {
		hostname: 'maker.ifttt.com',
		port: 443,
		path: '/trigger/' + event + '/json/with/key/' + webhookKey,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	}

	const req = https.request(postOptions, res => {
		res.on('data', d => {
		})
	});

	req.on('error', error => {
		console.error(error);
		throw error;
	})

	req.write(data)
	req.end()
}

function pushoverNotification(device, message, title, sound) {
	const data = JSON.stringify('{}');

	if (sound == null || sound == "")
		sound = "pushover";

	const postOptions = {
		hostname: 'api.pushover.net',
		port: 443,
		path: '/1/messages.json?token=' + process.env.PUSHOVER_TOKEN + '&user=' + process.env.PUSHOVER_USER + '&device=' + encodeURIComponent(device) + '&title=' + encodeURIComponent(title) + '&message=' + encodeURIComponent(message) + '&sound=' + encodeURIComponent(sound),
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	}

	const req = https.request(postOptions, res => {
		res.on('data', d => {
		})
	});

	req.on('error', error => {
		console.error(error);
		throw error;
	})

	req.write(data)
	req.end()
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
