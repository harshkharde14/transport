const {
  createAcademicYear,
  getAllAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
} = require("../Services/academicYearService");

// Create Academic Year
const createAcademicYearController = async (req, res) => {
  try {
    const academicYear = await createAcademicYear(req, res);

    return res.status(201).json({
      success: true,
      message: "Academic year created successfully",
      data: academicYear,
    });
  } catch (error) {
    console.error("Academic Year Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Academic Years
const getAllAcademicYearsController = async (req, res) => {
  try {
    const academicYears = await getAllAcademicYears();

    return res.status(200).json({
      success: true,
      count: academicYears.length,
      data: academicYears,
    });
  } catch (error) {
    console.error("Get Academic Years Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic years",
    });
  }
};

// Get Academic Year By ID
const getAcademicYearByIdController = async (req, res) => {
  try {
    const academicYear = await getAcademicYearById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: academicYear,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Academic Year
const updateAcademicYearController = async (req, res) => {
  try {
    const academicYear = await updateAcademicYear(req.params.id, req.body);

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Academic year updated successfully",
      data: academicYear,
    });
  } catch (error) {
    console.error("Update Academic Year Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createAcademicYearController,
  getAllAcademicYearsController,
  getAcademicYearByIdController,
  updateAcademicYearController,
};

//update api essue
