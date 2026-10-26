const { application } = require("express");
const mongoose = require("mongoose");

const admissionApplicationSchema = new mongoose.Schema(
  {
    application_no: {
      type: String,
      required: true,
      unique: true,
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },
    academic_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    requested_class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    child: {
      full_name: {
        type: String,
        required: true,
      },
      date_of_birth: {
        type: Date,
        required: true,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
      },
      relationship_to_child: {
        type: String,
        enum: ["father", "mother", "guardian"],
        required: true,
      },
      transport_interest: {
        type: Boolean,
        default: false,
      },
      previous_school_name: String,
      documents: [
        {
          document_type: String,
          storage_key: String,
          file_name: String,
          uploaded_at: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      status: {
        type: String,
        enum: [
          "draft",
          "submitted",
          "under_review",
          "needs_changes",
          "approved",
          "rejected",
          "withdrawn",
        ],
        default: "draft",
      },
      reviewed_at: Date,
      review_note: String,

      approved_section_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Secion",
      },

      student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sudent",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "admissionApllication",
  admissionApplicationSchema,
);
