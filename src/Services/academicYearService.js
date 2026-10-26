const mongoose = require("mongoose");
const AcademicYear = require("../Models/AcademicYear");

// ==================================================
// HELPER: PARSE AND VALIDATE DATE (DD-MM-YYYY)
// ==================================================

const parseDate = (value, fieldName) => {
  if (typeof value !== "string") {
    const error = new Error(`${fieldName} must be in DD-MM-YYYY format`);
    error.statusCode = 400;
    throw error;
  }

  const trimmedValue = value.trim();

  const match = trimmedValue.match(
    /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-(\d{4})$/,
  );

  if (!match) {
    const error = new Error(`${fieldName} must be in DD-MM-YYYY format`);
    error.statusCode = 400;
    throw error;
  }

  const [day, month, year] = trimmedValue.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCDate() !== day ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCFullYear() !== year
  ) {
    const error = new Error(`${fieldName} is not a valid calendar date`);
    error.statusCode = 400;
    throw error;
  }

  return date;
};

// ==================================================
// HELPER: VALIDATE YEAR NAME (YYYY-YYYY)
// ==================================================

const validateYearName = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error("Year name is required");
    error.statusCode = 400;
    throw error;
  }

  const yearName = value.trim();
  const match = yearName.match(/^(\d{4})-(\d{4})$/);

  if (!match) {
    const error = new Error("Year format must be YYYY-YYYY, e.g. 2026-2027");
    error.statusCode = 400;
    throw error;
  }

  if (Number(match[2]) !== Number(match[1]) + 1) {
    const error = new Error(
      "The second year must be one greater than the first year",
    );
    error.statusCode = 400;
    throw error;
  }

  return yearName;
};

// ==================================================
// HELPER: CALCULATE STATUS FROM DATES
// ==================================================

const calculateStatus = (startDate, endDate) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (today < startDate) {
    return "upcoming";
  }

  if (today > endDate) {
    return "closed";
  }

  return "active";
};

// ==================================================
// SECTION 1: CREATE ACADEMIC YEAR
// ==================================================

const createAcademicYear = async (req, res) => {
  try {
    const { year_name, start_date, end_date, status, created_by } = req.body;

    // STEP 1: Validate year name
    const trimmedYearName = validateYearName(year_name);

    // STEP 2: Validate dates
    const parsedStartDate = parseDate(start_date, "start_date");
    const parsedEndDate = parseDate(end_date, "end_date");

    // STEP 3: Validate date range
    if (parsedEndDate <= parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // STEP 4: Validate status
    const expectedStatus = calculateStatus(parsedStartDate, parsedEndDate);

    if (status !== expectedStatus) {
      return res.status(400).json({
        success: false,
        message: `Status for these dates must be "${expectedStatus}"`,
      });
    }

    // STEP 5: Validate created_by
    if (!created_by || !mongoose.Types.ObjectId.isValid(created_by)) {
      return res.status(400).json({
        success: false,
        message: "created_by must be a valid MongoDB ObjectId",
      });
    }

    // STEP 6: Check duplicate year
    const existingYear = await AcademicYear.findOne({
      year_name: trimmedYearName,
    });

    if (existingYear) {
      return res.status(409).json({
        success: false,
        message: `Academic year ${trimmedYearName} already exists`,
      });
    }

    // STEP 7: Create document
    const academicYear = await AcademicYear.create({
      year_name: trimmedYearName,
      start_date: parsedStartDate,
      end_date: parsedEndDate,
      status: expectedStatus,
      is_current: expectedStatus === "active",
      created_by,
    });

    return res.status(201).json({
      success: true,
      message: "Academic year created successfully",
      data: academicYear,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Academic year already exists",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create Academic Year Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================================================
// SECTION 2: GET ALL ACADEMIC YEARS
// ==================================================

const getAllAcademicYears = async () => {
  return await AcademicYear.find().sort({ start_date: -1 });
};

// ==================================================
// SECTION 3: GET ACADEMIC YEAR BY ID
// ==================================================

const getAcademicYearById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid academic year ID");
    error.statusCode = 400;
    throw error;
  }

  const academicYear = await AcademicYear.findById(id);

  if (!academicYear) {
    const error = new Error("Academic year not found");
    error.statusCode = 404;
    throw error;
  }

  return academicYear;
};

// ==================================================
// SECTION 4: UPDATE ACADEMIC YEAR
// ==================================================

const updateAcademicYear = async (id, data) => {
  // STEP 1: Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid academic year ID");
    error.statusCode = 400;
    throw error;
  }

  // STEP 2: Find existing academic year
  const academicYear = await AcademicYear.findById(id);

  if (!academicYear) {
    const error = new Error("Academic year not found");
    error.statusCode = 404;
    throw error;
  }

  // STEP 3: Update year name if provided
  if (data.year_name !== undefined) {
    academicYear.year_name = validateYearName(data.year_name);
  }

  // STEP 4: Update dates if provided
  if (data.start_date !== undefined) {
    academicYear.start_date = parseDate(data.start_date, "start_date");
  }

  if (data.end_date !== undefined) {
    academicYear.end_date = parseDate(data.end_date, "end_date");
  }

  // STEP 5: Validate date range
  if (academicYear.end_date <= academicYear.start_date) {
    const error = new Error("End date must be after start date");
    error.statusCode = 400;
    throw error;
  }

  // STEP 6: Calculate status from updated dates
  const updatedStatus = calculateStatus(
    academicYear.start_date,
    academicYear.end_date,
  );

  academicYear.status = updatedStatus;
  academicYear.is_current = updatedStatus === "active";

  // STEP 7: Save updated document
  return await academicYear.save();
};

// ==================================================
// EXPORT ALL FUNCTIONS
// ==================================================

module.exports = {
  createAcademicYear,
  getAllAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
};
