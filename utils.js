const https = require("https");

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

async function getRedisConfigParam(key) {
	await redisClient.connect();
	const value = await redisClient.get(key);
	await redisClient.quit();
	return value;
}

async function initRedisDefaultConfigParams() {
	await redisClient.connect();
	await redisClient.set("enableHeaterOnGenerator", 0);
	await redisClient.set("enableWaterPumpOnGenerator", 0);
	await redisClient.set("enableWaterPumpOnElectricity", 0);
	await redisClient.set("enableUpsOnGenerator", 0);
	await redisClient.set("heaterTurnedOnAutomatically", 0);
	await redisClient.quit();
}

function getEmailDomain(email) {
    const domainMatch = email.match(/@([^@]+)$/);
    if (domainMatch && domainMatch[1]) {
        return domainMatch[1];
    }
    return null;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = { iftttWebhook, pushoverNotification, getRedisConfigParam, initRedisDefaultConfigParams, getEmailDomain, sleep };
