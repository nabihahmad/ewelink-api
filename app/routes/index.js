const express = require("express");
const router = express.Router();
const mainController = require("../controllers/mainController");

router.post("/ewelink", mainController.handleMain);

module.exports = router;
