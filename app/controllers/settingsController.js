const redisModel = require("../models/redis");

exports.getToggleMasterSwitch = async (req, res) => {
  let responseJson = {};
  let enableMasterSwitch = await redisModel.getParam("enableMasterSwitch");
  responseJson.status = "success";
  responseJson.enableMasterSwitch = enableMasterSwitch;
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};

exports.toggleMasterSwitch = async (req, res) => {
  let responseJson = {};
  let requestBody = req.body;
  let enableMasterSwitch = requestBody.enableMasterSwitch != null ? requestBody.enableMasterSwitch : "0";
  await redisModel.setParam("enableMasterSwitch", enableMasterSwitch);
  responseJson.status = "success";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};

exports.getToggleHeaterOnGenerator = async (req, res) => {
  let responseJson = {};
  let enableHeaterOnGenerator = await redisModel.getParam("enableHeaterOnGenerator");
  responseJson.status = "success";
  responseJson.enableHeaterOnGenerator = enableHeaterOnGenerator;
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};

exports.toggleHeaterOnGenerator = async (req, res) => {
  let responseJson = {};
  let requestBody = req.body;
  let enableHeaterOnGenerator = requestBody.enableHeaterOnGenerator != null ? requestBody.enableHeaterOnGenerator : "0";
  await redisModel.setParam("enableHeaterOnGenerator", enableHeaterOnGenerator);
  responseJson.status = "success";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};

exports.getToggleUpsOnGenerator = async (req, res) => {
  let responseJson = {};
  let enableUpsOnGenerator = await redisModel.getParam("enableUpsOnGenerator");
  responseJson.status = "success";
  responseJson.enableUpsOnGenerator = enableUpsOnGenerator;
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};

exports.toggleUpsOnGenerator = async (req, res) => {
  let responseJson = {};
  let requestBody = req.body;
  let enableUpsOnGenerator = requestBody.enableUpsOnGenerator != null ? requestBody.enableUpsOnGenerator : "0";
  await redisModel.setParam("enableUpsOnGenerator", enableUpsOnGenerator);
  responseJson.status = "success";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};
