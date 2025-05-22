app.get('/redis', async (req, res) => {
	let responseJson = {};
	const key = req.query.key;
	if (!key) {
		responseJson.status = "error";
		responseJson.message = "Missing 'key' query parameter";
		res.setHeader('Content-Type', 'application/json');
		res.status(400).send(JSON.stringify(responseJson));
		return;
	}
	console.log("key", key);
	await redisClient.connect();
	console.log("connected", key);
	const value = await redisClient.get(key);
	console.log("value for key: " + key, value);
	await redisClient.quit();
	console.log("disconnected", key);
	responseJson.status = "success";
	responseJson.value = value;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/redis', async (req, res) => {
	let responseJson = {};
	const key = req.body.key;
	const value = req.body.value;
	if (!key || !value) {
		responseJson.status = "error";
		responseJson.message = "Missing 'key' or 'value' in request body";
		res.setHeader('Content-Type', 'application/json');
		res.status(400).send(JSON.stringify(responseJson));
		return;
	}
	console.log("key", key);
	console.log("value", value);
	await redisClient.connect();
	console.log("connected", key);
	await redisClient.set(key, value);
	console.log("set value for key: " + key, value);
	await redisClient.quit();
	console.log("disconnected", key);
	responseJson.status = "success";
	responseJson.message = "Value set successfully";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleHeaterOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableHeaterOnGenerator = requestBody.enableHeaterOnGenerator != null ? requestBody.enableHeaterOnGenerator : "0";
	console.log("enableHeaterOnGenerator", enableHeaterOnGenerator);

	// await electricityDB.set("config", {"enableHeaterOnGenerator": enableHeaterOnGenerator});
	const putHeaterOnGeneratorParams = {TableName: 'ewelink', Item: {id: { S: 'enableHeaterOnGenerator' }, state: { N: enableHeaterOnGenerator }}};
	dynamodb.putItem(putHeaterOnGeneratorParams, (err) => {if (err) {console.error('Error writing enableHeaterOnGenerator:', err);}});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleHeaterOnGenerator', async (req, res) => {
	let responseJson = {};

	// let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	// responseJson.enableHeaterOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableHeaterOnGenerator != null ? electricityConfig.props.enableHeaterOnGenerator : 0;
	let enableHeaterOnGenerator = 0;
	const getEnableHeaterOnGeneratorParams = {TableName: 'ewelink', Key: {id: {S: 'enableHeaterOnGenerator'}}};
	const getEnableHeaterOnGeneratorData = await dynamodb.getItem(getEnableHeaterOnGeneratorParams).promise();
	enableHeaterOnGenerator = getEnableHeaterOnGeneratorData.Item.state.N;
	responseJson.enableHeaterOnGenerator = enableHeaterOnGenerator;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleWaterPumpOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableWaterPumpOnGenerator = requestBody.enableWaterPumpOnGenerator != null ? requestBody.enableWaterPumpOnGenerator : "0";
	console.log("enableWaterPumpOnGenerator", enableWaterPumpOnGenerator);

	// await electricityDB.set("config", {"enableWaterPumpOnGenerator": enableWaterPumpOnGenerator});
	const putWaterPumpOnGeneratorParams = {TableName: 'ewelink', Item: {id: { S: 'enableWaterPumpOnGenerator' }, state: { N: enableWaterPumpOnGenerator }}};
	dynamodb.putItem(putWaterPumpOnGeneratorParams, (err) => {if (err) {console.error('Error writing enableWaterPumpOnGenerator:', err);}});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleWaterPumpOnGenerator', async (req, res) => {
	let responseJson = {};

	// let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	// responseJson.enableWaterPumpOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnGenerator != null ? electricityConfig.props.enableWaterPumpOnGenerator : 0;
	let enableWaterPumpOnGenerator = 0;
	const getEnableWaterPumpOnGeneratorParams = {TableName: 'ewelink', Key: {id: {S: 'enableWaterPumpOnGenerator'}}};
	const getEnableWaterPumpOnGeneratorData = await dynamodb.getItem(getEnableWaterPumpOnGeneratorParams).promise();
	enableWaterPumpOnGenerator = getEnableWaterPumpOnGeneratorData.Item.state.N;
	responseJson.enableWaterPumpOnGenerator = enableWaterPumpOnGenerator;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleWaterPumpOnElectricity', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableWaterPumpOnElectricity = requestBody.enableWaterPumpOnElectricity != null ? requestBody.enableWaterPumpOnElectricity : "0";
	console.log("enableWaterPumpOnElectricity", enableWaterPumpOnElectricity);

	// await electricityDB.set("config", {"enableWaterPumpOnElectricity": enableWaterPumpOnElectricity});
	const putWaterPumpOnElectricityParams = {TableName: 'ewelink', Item: {id: { S: 'enableWaterPumpOnElectricity' }, state: { N: enableWaterPumpOnElectricity }}};
	dynamodb.putItem(putWaterPumpOnElectricityParams, (err) => {if (err) {console.error('Error writing enableWaterPumpOnElectricity:', err);}});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleWaterPumpOnElectricity', async (req, res) => {
	let responseJson = {};

	// let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	// responseJson.enableWaterPumpOnElectricity = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableWaterPumpOnElectricity != null ? electricityConfig.props.enableWaterPumpOnElectricity : 0;
	let enableWaterPumpOnElectricity = 0;
	const getEnableWaterPumpOnElectricityParams = {TableName: 'ewelink', Key: {id: {S: 'enableWaterPumpOnElectricity'}}};
	const getEnableWaterPumpOnElectricityData = await dynamodb.getItem(getEnableWaterPumpOnElectricityParams).promise();
	enableWaterPumpOnElectricity = getEnableWaterPumpOnElectricityData.Item.state.N;
	responseJson.enableWaterPumpOnElectricity = enableWaterPumpOnElectricity;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.post('/toggleUpsOnGenerator', async (req, res) => {
	let responseJson = {};
	let requestBody = req.body;
	let enableUpsOnGenerator = requestBody.enableUpsOnGenerator != null ? requestBody.enableUpsOnGenerator : "0";
	console.log("enableUpsOnGenerator", enableUpsOnGenerator);

	// await electricityDB.set("config", {"enableUpsOnGenerator": enableUpsOnGenerator});
	const putUpsOnGeneratorParams = {TableName: 'ewelink', Item: {id: { S: 'enableUpsOnGenerator' }, state: { N: enableUpsOnGenerator }}};
	dynamodb.putItem(putUpsOnGeneratorParams, (err) => {if (err) {console.error('Error writing enableUpsOnGenerator:', err);}});
	responseJson.status = "success";
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});

app.get('/toggleUpsOnGenerator', async (req, res) => {
	let responseJson = {};

	// let electricityConfig = await electricityDB.get("config");
	responseJson.status = "success";
	// responseJson.enableUpsOnGenerator = electricityConfig != null && electricityConfig.props != null && electricityConfig.props.enableUpsOnGenerator != null ? electricityConfig.props.enableUpsOnGenerator : 0;
	let enableUpsOnGenerator = 0;
	const getEnableUpsOnGeneratorParams = {TableName: 'ewelink', Key: {id: {S: 'enableUpsOnGenerator'}}};
	const getEnableUpsOnGeneratorData = await dynamodb.getItem(getEnableUpsOnGeneratorParams).promise();
	enableUpsOnGenerator = getEnableUpsOnGeneratorData.Item.state.N;
	responseJson.enableUpsOnGenerator = enableUpsOnGenerator;
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(responseJson));
});