const express = require("express");
const router = express.Router();

const {
  createSchoolController,
  getSchoolByCodeController,
  updateSchoolController,
} = require("../Controllers/schoolController");

router.post("/school", createSchoolController);

router.get("/school/:schoolCode", getSchoolByCodeController);

router.patch("/school/:schoolCode", updateSchoolController);

module.exports = router;
