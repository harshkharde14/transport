const {
  createSchoolService,
  getSchoolByCodeService,
  updateSchoolService,
} = require("../Services/schoolService");

// Create School
const createSchoolController = async (req, res) => {
  try {
    const data = req.body;

    const school = await createSchoolService(data);

    return res.status(201).json({
      success: true,
      message: "School created successfully!",
      data: school,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate school code or email",
      });
    }

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get School By Code
const getSchoolByCodeController = async (req, res) => {
  try {
    const schoolCode = req.params.schoolCode;

    const school = await getSchoolByCodeService(schoolCode);

    return res.status(200).json({
      success: true,
      message: "School fetched successfully",
      data: school,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
//update school ********************************************************

const updateSchoolController = async (req, res) => {
  try {
    const schoolCode = req.params.schoolCode;
    const data = req.body;
    const school = await updateSchoolService(schoolCode, data);
    return res.status(200).json({
      success: true,
      message: "School updated successfully",
      data: school,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createSchoolController,
  getSchoolByCodeController,
  updateSchoolController,
};
