const express = require("express");
const app = express();
const { port } = require("./config/env");
app.use(express.json());

const mainRoutes = require("./app/routes/index");
const settingsRoutes = require("./app/routes/settings");
const testRoutes = require("./app/routes/test.js");

app.use("/", mainRoutes);
app.use("/settings", settingsRoutes);
if (process.env.NODE_ENV !== "production") {
  app.use("/test", testRoutes);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
