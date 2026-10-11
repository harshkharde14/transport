const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

console.log("URI first characters:", JSON.stringify(
  (process.env.MONGO_URI || "").slice(0, 25)
));

const express = require("express");
const connectDB = require("./db");

const app = express();

app.use(express.json());


connectDB()
  .then(() => {
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });
