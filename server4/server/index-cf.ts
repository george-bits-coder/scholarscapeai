import * as functions from "firebase-functions";
import express from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let isInitialized = false;

const initializeApp = async () => {
  if (isInitialized) return;
  await registerRoutes(app);
  isInitialized = true;
};

export const api = functions.https.onRequest(async (req, res) => {
  await initializeApp();
  
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  app(req, res);
});
