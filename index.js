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
ELECTRICITY_DEVICEID=process.env.ELECTRICITY_DEVICEID;
FOUR_CH_PRO_DEVICEID=process.env.FOUR_CH_PRO_DEVICEID;
WATER_PUMP_DEVICEID=process.env.WATER_PUMP_DEVICEID;

app.post('/ewelink', async (req, res) => {
	let responseJson = {};
	let electricityDBUpdate = {};
	if (process.env.DISABLE_SCRIPT == "false") {
		var beirutTimezone = (new Date()).getTime() + (120 * 60000);
		const nowTime = new Date(beirutTimezone);
		let hourOfDay = nowTime.getHours();
		let dayOfWeek = nowTime.getDay();

		let electricityConfig = await electricityDB.get("config");

		let enableHeaterOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableHeaterOnGenerator != null ? electricityConfig.props.enableHeaterOnGenerator : 0;

		let enableWaterPumpOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnGenerator != null ? electricityConfig.props.enableWaterPumpOnGenerator : 0;

		let lastState = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.lastState != null ? electricityConfig.props.lastState : 0;

		let offlineOrNoElectricityCount = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.offlineOrNoElectricityCount != null ? electricityConfig.props.offlineOrNoElectricityCount : 0;

		console.log("Running mode:", enableHeaterOnGenerator, enableWaterPumpOnGenerator, lastState, offlineOrNoElectricityCount);

		const connection = new ewelink({
			email: process.env.EWELINK_EMAIL,
			password: atob.atob(process.env.EWELINK_PASSWORD),
			region: 'us',
		});

		/* get specific devide info */
		const electricity_device = await connection.getDevice(ELECTRICITY_DEVICEID);
		const four_ch_pro_device = await connection.getDevice(FOUR_CH_PRO_DEVICEID);

		if (four_ch_pro_device.online && four_ch_pro_device.params.switches[2].switch == "on") {
			const status = await connection.toggleDevice(FOUR_CH_PRO_DEVICEID, 3);
			console.log("Status FOUR_CH_PRO_DEVICEID", status);
			responseJson.ch4_pro_toggled = true;
		} else
			responseJson.ch4_pro_toggled = false;

		if (electricity_device.online && electricity_device.params.switch == "on") {
			responseJson.online = true;
			responseJson.electricity = true;
			console.log("Electricity");
			if (lastState == 0) {
				console.log("logElectricity 1 for state", lastState);
				electricityDBUpdate.lastState = 1; // cache.set("last_electricity_state", 1);
				iftttWebhook({message: "Electricity is on"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
				iftttWebhook({message: "Electricity is on"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
				iftttWebhook({message: "كهرباء الدولة متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_DAD);
				iftttWebhook({message: "كهرباء الدولة متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_MOM);
			}
			electricityDBUpdate.offlineOrNoElectricityCount = 0; // cache.set("offline_or_no_electricity", 0);

			const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
			console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.params.switch);
			if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "off") {
				// if (dayOfWeek != 5 && dayOfWeek != 6) {
					const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
					console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
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

			const water_pump_switch_device = await connection.getDevice(WATER_PUMP_DEVICEID);
			console.log("Switch WATER_PUMP_DEVICEID", water_pump_switch_device.params.switch);
			if (water_pump_switch_device.online && water_pump_switch_device.params.switch == "off") {
				const status = await connection.toggleDevice(WATER_PUMP_DEVICEID);
				console.log("Toggle WATER_PUMP_DEVICEID", status);
			}
		} else if (!electricity_device.online && four_ch_pro_device.online) {
			responseJson.online = true;
			responseJson.electricity = false;
			electricityDBUpdate.offlineOrNoElectricityCount = 0; // cache.set("offline_or_no_electricity", 0);
			console.log("No electricity");
			if (lastState == 1) {
				console.log("logElectricity 0 for state", lastState);
				electricityDBUpdate.lastState = 0; // cache.set("last_electricity_state", 0);
				iftttWebhook({message: "Electricity is off"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
				iftttWebhook({message: "Electricity is off"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
				iftttWebhook({message: "كهرباء الدولة غير متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_DAD);
				iftttWebhook({message: "كهرباء الدولة غير متوفرة"}, 'notification', process.env.IFTTT_WEBHOOK_KEY_MOM);
			}

			if (enableHeaterOnGenerator == 0) {
				const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.params.switch);
				if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "on") {
					const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
					console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
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
			}
		} else if (!electricity_device.online && !four_ch_pro_device.online) {
			responseJson.online = false;
			console.log("No electricity or network");
			const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
			if (!power_measuring_switch_device.online) {
				if (offlineOrNoElectricityCount != null && offlineOrNoElectricityCount == 6) {
					electricityDBUpdate.offlineOrNoElectricityCount = 0; // cache.set("offline_or_no_electricity", 0);
					console.log("No electricity or network for 30 minutes");
					iftttWebhook({message: "No electricity or network for 30 minutes"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
					iftttWebhook({message: "No electricity or network for 30 minutes"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
				} else if (offlineOrNoElectricityCount != null)
					electricityDBUpdate.offlineOrNoElectricityCount = offlineOrNoElectricityCount + 1; // cache.set("offline_or_no_electricity", offlineOrNoElectricityCount + 1);
				else
					electricityDBUpdate.offlineOrNoElectricityCount = 1; // cache.set("offline_or_no_electricity", 1);
			}
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

	let electricityConfig = await electricityDB.set("config", {"enableHeaterOnGenerator": enableHeaterOnGenerator});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});
app.get('/toggleHeaterOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;

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

	let electricityConfig = await electricityDB.set("config", {"enableWaterPumpOnGenerator": enableWaterPumpOnGenerator});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});
app.get('/toggleWaterPumpOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;

	let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	responseJson.enableWaterPumpOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnGenerator != null ? electricityConfig.props.enableWaterPumpOnGenerator : 0;
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
