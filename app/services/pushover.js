const https = require("https");
const { pushoverToken, pushoverUser } = require("../../config/env");

async function sendPushNotification(device, message, title, sound) {
  const data = JSON.stringify("{}");

  if (sound == null || sound == "") sound = "pushover";

  const postOptions = {
    hostname: "api.pushover.net",
    port: 443,
    path:
      "/1/messages.json?token=" +
      pushoverToken +
      "&user=" +
      pushoverUser +
      "&device=" +
      encodeURIComponent(device) +
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

module.exports = {
  sendPushNotification,
};
