const mongoose = require("mongoose");

const academicYearSchema = new mongoose.Schema(
  {
    year_name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    start_date: {
      type: Date,
      required: true,
    },

    end_date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["upcoming", "active", "closed"],
      default: "upcoming",
      required: true,
    },

    is_current: {
      type: Boolean,
      default: false,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    closed_at: {
      type: Date,
      default: null,
    },

    closed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    close_reason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("AcademicYear", academicYearSchema);
