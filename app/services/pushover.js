const https = require("https");
const { pushoverToken, pushoverUser } = require("../../config/env");
const messages = require("../utils/messages");

async function sendPushNotification(user, messageKey, titleKey, sound) {
  const data = JSON.stringify("{}");

  if (sound == null || sound == "") sound = "pushover";

  let message = messages.get(messageKey, user.lang || "en");
  let title = messages.get(titleKey, user.lang || "en");

  const postOptions = {
    hostname: "api.pushover.net",
    port: 443,
    path:
      "/1/messages.json?token=" +
      pushoverToken +
      "&user=" +
      pushoverUser +
      "&device=" +
      encodeURIComponent(user.pushoverName) +
      "&title=" +
      encodeURIComponent(title) +
      "&message=" +
      encodeURIComponent(message) +
      "&sound=" +
      encodeURIComponent(sound),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const req = https.request(postOptions, (res) => {
    res.on("data", () => {});
  });

  req.on("error", (error) => {
    console.error(error);
    throw error;
  });

  req.write(data);
  req.end();
}

async function broadcastPushNotification(pushoverUsers, messageKey, titleKey, sound) {
  for (const user of pushoverUsers) {
    try {
      await sendPushNotification(user, messageKey, titleKey, sound);
    } catch (error) {
      console.error(`Error sending push notification to ${user}:`, error);
    }
  }
}

module.exports = {
  sendPushNotification,
  broadcastPushNotification,
};
