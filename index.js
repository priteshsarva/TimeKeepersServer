// ==========================
//  Secure Express Server
//  Domain: api.timeskeepers.in
//  HTTPS + HTTP→HTTPS redirect
// ==========================

import https from "https";
import http from "http";
import fs from "fs";
import express from "express";
import cors from "cors";

// ====== Your Imports ======
import { DB } from "./connect.js";
import router from "./view/routes.js";
import categories from "./view/categories.js";
import product from "./view/product.js";
import sizes from "./view/sizes.js";
import tags from "./view/tags.js";
import vendor from "./view/vendor.js";
import productSizes from "./view/productSizes.js";
import productCategories from "./view/productCategories.js";
import brand from "./view/brand.js";
import productBrand from "./view/productBrand.js";
import { fetchDataa } from "./controller/newtemp.js";
import { baseUrls } from "./baseUrls.js";

// ====== Express App Setup ======
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: "GET,POST,PUT,DELETE",
  })
);

// ====== Basic Route ======
app.get("/", (req, res) => {
  res.status(200).json({ status: 200, message: "🔐 Secure API Running" });
});

// ====== Routes ======
app.use(router);
app.use("/category", categories);
app.use("/product", product);
app.use("/size", sizes);
app.use("/tag", tags);
app.use("/vendor", vendor);
app.use("/productsize", productSizes);
app.use("/productcategories", productCategories);
app.use("/brand", brand);
app.use("/productbrand", productBrand);

// ====== Scraper Trigger ======
app.get("/devproductupdates", (req, res) => {
  try {
    fetchDataa(baseUrls);
    res.status(200).json({
      status: 200,
      message: "Scraping started successfully ✅",
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// ====== SSL Certificate Paths ======
const sslOptions = {
  key: fs.readFileSync("/etc/letsencrypt/live/api.timeskeepers.in/privkey.pem"),
  cert: fs.readFileSync(
    "/etc/letsencrypt/live/api.timeskeepers.in/fullchain.pem"
  ),
};

// ====== HTTPS Server ======
https.createServer(sslOptions, app).listen(443, () => {
  console.log("✅ Secure server running at https://api.timeskeepers.in");
});

// ====== HTTP → HTTPS Redirect ======
http
  .createServer((req, res) => {
    res.writeHead(301, {
      Location: "https://" + req.headers.host + req.url,
    });
    res.end();
  })
  .listen(80, () => {
    console.log("🌐 Redirecting all HTTP traffic to HTTPS");
  });
