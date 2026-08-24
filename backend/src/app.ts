import express, { Express } from "express";
import cors from "cors";
import path from "node:path";
import { migrate } from "./db/migrate";
import { seedIfEmpty, backfillPhotos } from "./db/seed";
import { speciesRouter } from "./routes/species";
import { plantsRouter } from "./routes/plants";
import { treatmentsRouter } from "./routes/treatments";
import { exportRouter } from "./routes/export";

export function createApp(): Express {
  migrate();
  seedIfEmpty();
  backfillPhotos();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/species", speciesRouter);
  app.use("/api/plants", plantsRouter);
  app.use("/api", treatmentsRouter);
  app.use("/api/export", exportRouter);

  return app;
}
