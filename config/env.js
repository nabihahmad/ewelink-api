require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  disableScript: process.env.DISABLE_SCRIPT == "true",
  enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES == "true",

  ewelinkEmail: process.env.EWELINK_EMAIL,
  ewelinkPassword: process.env.EWELINK_PASSWORD,
  ewelinkAppID: process.env.EWELINK_APP_ID,
  ewelinkAppSecret: process.env.EWELINK_APP_SECRET,

  automatedAC: process.env.AUTOMATED_AC,
  automatedHeater: process.env.AUTOMATED_HEATER,
  start4CHProChannel: process.env.START_4CH_PRO_CHANNEL,

  powerMeasuringSwitchDeviceID: process.env.POWER_MEASURING_SWITCH_DEVICEID,
  powerMeasuringDualR3DeviceID: process.env.POWER_MEASURING_DUALR3_DEVICEID,
  electricityDeviceID: process.env.ELECTRICITY_DEVICEID,
  fourCHPRODeviceID: process.env.FOUR_CH_PRO_DEVICEID,
  fourCHPROR3DeviceID: process.env.FOUR_CH_PROR3_DEVICEID,
  buildingEntranceTimerMiniDeviceID: process.env.BUILDING_ENTRANCE_TIMER_MINI_DEVICEID,
  buildingEntranceInteriorMiniDeviceID: process.env.BUILDING_ENTRANCE_INTERIOR_MINI_DEVICEID,
  buildingEntranceGateMiniDeviceID: process.env.BUILDING_ENTRANCE_GATE_MINI_DEVICEID,
  buildingGateFourCHPRODeviceID: process.env.BUILDING_GATE_FOUR_CH_PRO_DEVICEID,
  waterCoolerDeviceID: process.env.WATER_COOLER_DEVICEID,
  buildingEntranceInteriorLightingDeviceID: process.env.BUILDING_ENTRANCE_INTERIOR_LIGHTING_DEVICEID,
  upsInputDeviceID: process.env.UPS_INPUT_DEVICEID,
  upsOutputDeviceID: process.env.UPS_OUTPUT_DEVICEID,

  dualR3KidsACSwitch: 1,
  dualR3HeaterSwitch: 2,

  pushoverToken: process.env.PUSHOVER_TOKEN,
  pushoverUser: process.env.PUSHOVER_USER,

  redisURL: process.env.REDIS_URL,
};
