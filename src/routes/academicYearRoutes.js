const express = require("express");

const {
  createAcademicYearController,
  getAllAcademicYearsController,
  getAcademicYearByIdController,
  updateAcademicYearController,
} = require("../Controllers/academicYearController");

const router = express.Router();

// Create Academic Year
router.post("/academic-years", createAcademicYearController);

// Get All Academic Years
router.get("/academic-years", getAllAcademicYearsController);

// Get Academic Year By ID
router.get("/academic-years/:id", getAcademicYearByIdController);

// Update Academic Year
router.put("/academic-years/:id", updateAcademicYearController);

module.exports = router;
