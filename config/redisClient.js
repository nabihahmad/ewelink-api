const { createClient } = require("redis");
const { redisURL } = require("./env");

const redisClient = createClient({
  url: redisURL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

module.exports = redisClient;
