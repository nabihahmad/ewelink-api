const express = require("express");
const app = express();
const { port, enableDebugRoutes } = require("./config/env");
app.use(express.json());

const mainRoutes = require("./app/routes/index");
const settingsRoutes = require("./app/routes/settings");
const testRoutes = require("./app/routes/test");

app.use("/", mainRoutes);
app.use("/settings", settingsRoutes);
if (process.env.NODE_ENV !== "production") {
  app.use("/test", testRoutes);
}
if (enableDebugRoutes) {
  const debugRoutes = require("./app/routes/debug");
  app.use("/debug", debugRoutes);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
