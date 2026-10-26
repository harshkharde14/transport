const moongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      requred: true,
    },
    roles: {
      type: [String],
      enum: [
        "school_admin",
        //  "admission_oicer",
        "transport_admin",
        "teacher",
        "driver",
        "attendant", //BUS DIDI
        //  "gatekeeper",
        "parent",
      ],
      default: ["parent"],
      required: true,
    },
    status: {
      type: String,
      enum: ["actve", "blocked", "inactive"],
      default: "active",
    },
    last_login_at: {
      type: Date,
      deault: "active",
    },
  },
  {
    timestamps: true,
  },
);
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
