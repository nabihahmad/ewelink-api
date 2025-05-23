const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

router.get("/toggleHeaterOnGenerator", settingsController.getToggleHeaterOnGenerator);
router.post("/toggleHeaterOnGenerator", settingsController.toggleHeaterOnGenerator);
router.get("/toggleUpsOnGenerator", settingsController.getToggleUpsOnGenerator);
router.post("/toggleUpsOnGenerator", settingsController.toggleUpsOnGenerator);

module.exports = router;
