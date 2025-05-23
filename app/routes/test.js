const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");

router.get("/connect", testController.connect);
router.post("/notification", testController.notification);

module.exports = router;
