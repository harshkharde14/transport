const School = require("../Models/School");

// Create School
const createSchoolService = async (data) => {
  // Required fields validation
  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new Error("School name is required and cannot be empty");
  }

  // School code validation
  if (data.code) {
    throw new Error("School code is auto-generated");
  }

  // Phone number validation (+91 required)
  if (!/^\+91[0-9]{10}$/.test(data.phone || "")) {
    throw new Error(
      "Phone number must start with +91 and contain exactly 10 digits",
    );
  }

  // Email validation
  if (
    typeof data.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
  ) {
    throw new Error("Please provide a valid email address");
  }

  // Normalize email
  data.email = data.email.trim().toLowerCase();

  // Duplicate email validation
  const existingEmail = await School.findOne({
    email: data.email,
  });

  if (existingEmail) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  // Address validation
  if (
    !data.address ||
    typeof data.address.line1 !== "string" ||
    !data.address.line1.trim() ||
    typeof data.address.city !== "string" ||
    !data.address.city.trim() ||
    typeof data.address.state !== "string" ||
    !data.address.state.trim() ||
    !/^\d{6}$/.test(data.address.postal_code || "")
  ) {
    throw new Error(
      "Valid address, city, state and 6-digit postal code are required",
    );
  }

  // Status validation
  if (
    data.status !== undefined &&
    !["active", "inactive"].includes(data.status)
  ) {
    throw new Error("Status must be active or inactive");
  }

  // Allocation version validation
  if (
    data.allocation_version !== undefined &&
    (!Number.isInteger(data.allocation_version) || data.allocation_version < 0)
  ) {
    throw new Error("Allocation version must be a non-negative integer");
  }

  // Generate school code
  let schoolCode;

  do {
    schoolCode = `SCH${Date.now()}${Math.floor(Math.random() * 1000)}`;
  } while (await School.exists({ code: schoolCode }));

  data.code = schoolCode;

  // Create school after all validations
  return await School.create(data);
};

//get school by Id
const getSchoolByCodeService = async (schoolCode) => {
  const school = await School.findOne({ code: schoolCode });

  if (!school) {
    const error = new Error("School not found");
    error.statusCode = 404;
    throw error;
  }
  return school;
};

// Update School By Code ********************************************************
const updateSchoolService = async (schoolCode, data) => {
  const allowedFields = [
    "name",
    "phone",
    "email",
    "address",
    "timezone",
    "status",
  ];

  const updateData = {};

  // Sirf allowed fields update hongi
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  // Check karo ki update ke liye data diya hai ya nahi
  if (Object.keys(updateData).length === 0) {
    const error = new Error("Please provide fields to update");
    error.statusCode = 400;
    throw error;
  }

  // School find karke update karo
  const school = await School.findOneAndUpdate(
    { code: schoolCode },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  if (!school) {
    const error = new Error("School not found");
    error.statusCode = 404;
    throw error;
  }

  return school;
};

module.exports = {
  createSchoolService,
  getSchoolByCodeService,
  updateSchoolService,
};
