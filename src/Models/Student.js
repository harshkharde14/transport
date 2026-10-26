const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    admission_no: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    admission_application_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdmissionApplication",
      required: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    date_of_birth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    admitted_on: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "withdrawn", "graduated"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Student", studentSchema);
