const redis = require("../../config/redisClient");

module.exports = {
  async getParam(key) {
    await redis.connect();
    let value = await redis.get(key);
    await redis.quit();
    return value;
  },

  async setParam(key, value) {
    await redis.connect();
    await redis.set(key, value);
    await redis.quit();
  },

  async setParams(params) {
    await redis.connect();
    for (const [key, value] of Object.entries(params)) {
      await redis.set(key, value);
    }
    await redis.quit();
  },

  async initRedisDefaultConfigParams() {
    await redis.connect();
    await redis.set("enableHeaterOnGenerator", 0);
    await redis.set("enableWaterPumpOnGenerator", 0);
    await redis.set("enableWaterPumpOnElectricity", 0);
    await redis.set("enableUpsOnGenerator", 0);
    await redis.set("heaterTurnedOnAutomatically", 0);
    await redis.quit();
  },
};
