import express from "express";
import "express-async-errors"; // must be imported before routes for async error forwarding
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan(config.env === "development" ? "dev" : "combined"));

app.use("/api/v1", apiRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" },
  });
});

// Must be registered after all routes.
app.use(errorHandler);
