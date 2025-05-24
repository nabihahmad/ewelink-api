const redisModel = require("../models/redis");

exports.getRedisValue = async (req, res) => {
  let responseJson = {};
  req.query = req.query || {};
  let key = req.query.key != null ? req.query.key : "";
  let value = await redisModel.getParam(key);
  responseJson.status = "success";
  responseJson[key] = value;
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};

exports.setRedisValue = async (req, res) => {
  let responseJson = {};
  let requestBody = req.body;
  let key = requestBody.key != null ? requestBody.key : "";
  let value = requestBody.value != null ? requestBody.value : "";
  if (key === "" || value === "") {
    responseJson.status = "failed";
    responseJson.message = "Key and value must be provided.";
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(responseJson));
    return;
  }
  await redisModel.setParam(key, value);
  responseJson.status = "success";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(responseJson));
};
