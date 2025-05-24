const express = require("express");
const router = express.Router();
const debugController = require("../controllers/debugController");

router.get("/redis", debugController.getRedisValue);
router.post("/redis", debugController.setRedisValue);

module.exports = router;
