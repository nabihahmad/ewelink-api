const express = require('express');
const app = express();
require('dotenv').config();
const https = require("https");
const NodeCache = require("node-cache");
const cache = new NodeCache();
const ewelink = require('ewelink-api');
const atob = require("atob");

POWER_MEASURING_SWITCH_DEVICEID=process.env.POWER_MEASURING_SWITCH_DEVICEID;
ELECTRICITY_DEVICEID=process.env.ELECTRICITY_DEVICEID;
FOUR_CH_PRO_DEVICEID=process.env.FOUR_CH_PRO_DEVICEID;

app.all('/ewelink', async (req, res) => {
	let responseJson = {};
	if (process.env.DISABLE_SCRIPT == "false") {
		let lastState = cache.get("last_electricity_state");
		console.log("lastState", lastState);
		if (lastState != null)
			cache.set("last_electricity_state", lastState);
		else
			cache.set("last_electricity_state", 0);

		const connection = new ewelink({
			email: process.env.EWELINK_EMAIL,
			password: atob.atob(process.env.EWELINK_PASSWORD),
			region: 'us',
		});

		/* get specific devide info */
		const device = await connection.getDevice(ELECTRICITY_DEVICEID);
		const four_ch_pro_device = await connection.getDevice(FOUR_CH_PRO_DEVICEID);

		if (four_ch_pro_device.online && four_ch_pro_device.params.switches[2].switch == "on") {
			const status = await connection.toggleDevice(FOUR_CH_PRO_DEVICEID, 3);
			console.log("Status FOUR_CH_PRO_DEVICEID", status);
			responseJson.ch4_pro_toggled = true;
		} else
			responseJson.ch4_pro_toggled = false;

		if (device.online && device.params.switch == "on") {
			responseJson.online = true;
			responseJson.electricity = true;
			console.log("Electricity");
			if (lastState == 0) {
				console.log("logElectricity 1 for state", lastState);
				responseJson.new_electricity_status = 1;
				cache.set("last_electricity_state", 1);
			}
			const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
			console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.params.switch);
			if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "off") {
				cache.set("offline_or_no_electricity", 0);
				const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);

				if (process.env.START_4CH_PRO_CHANNEL != null && process.env.START_4CH_PRO_CHANNEL != "")	{
					try {
						startChannel = parseInt(process.env.START_4CH_PRO_CHANNEL);
						if (four_ch_pro_device.online && four_ch_pro_device.params.switches[startChannel-1].switch == "off") {
							const statusChannel = await connection.toggleDevice(FOUR_CH_PRO_DEVICEID, startChannel);
							console.log("Toggle FOUR_CH_PRO_DEVICEID", statusChannel);
						}
					} catch (e) {}
				}

				iftttWebhook({message: "Electricity is on"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
                iftttWebhook({message: "Electricity is on"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
			}
		} else if (!device.online && four_ch_pro_device.online) {
			responseJson.online = true;
			responseJson.electricity = false;
			cache.set("offline_or_no_electricity", 0);
			console.log("No electricity");
			if (lastState == 1) {
				console.log("logElectricity 0 for state", lastState);
				responseJson.new_electricity_status = 0;
				cache.set("last_electricity_state", 0);
			}
			const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
			console.log("Switch POWER_MEASURING_SWITCH_DEVICEID", power_measuring_switch_device.params.switch);
			if (power_measuring_switch_device.online && power_measuring_switch_device.params.switch == "on") {
				const status = await connection.toggleDevice(POWER_MEASURING_SWITCH_DEVICEID);
				console.log("Toggle POWER_MEASURING_SWITCH_DEVICEID", status);
			}
		} else if (!device.online && !four_ch_pro_device.online) {
			responseJson.online = false;
			const power_measuring_switch_device = await connection.getDevice(POWER_MEASURING_SWITCH_DEVICEID);
			if (!power_measuring_switch_device.online) {
				offlineOrNoElectricityCount = cache.get("offline_or_no_electricity");
				console.log("offline_or_no_electricity", offlineOrNoElectricityCount);
				if (offlineOrNoElectricityCount != null && offlineOrNoElectricityCount == 6) {
					cache.set("offline_or_no_electricity", 1);
					console("No electricity or network for 30 minutes");
					iftttWebhook({message: "No electricity or network for 30 minutes"}, 'notification', process.env.IFTTT_WEBHOOK_KEY);
                    iftttWebhook({message: "No electricity or network for 30 minutes"}, 'electricity', process.env.IFTTT_WEBHOOK_KEY_ROHAN);
				} else if (offlineOrNoElectricityCount != null)
					cache.set("offline_or_no_electricity", offlineOrNoElectricityCount + 1);
				else
					cache.set("offline_or_no_electricity", 1);
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
})
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