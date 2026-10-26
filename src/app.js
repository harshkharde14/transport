require("dotenv").config();

const express = require("express");
const connectDB = require("./db");

const academicYearRoutes = require("./routes/academicYearRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const app = express();

app.use(express.json());

app.use("/api", academicYearRoutes);
app.use("/api", schoolRoutes);

connectDB()
  .then(() => {
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });
