import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { migrate } from "./db/migrate";
import {
  seedIfEmpty,
  backfillSpeciesText,
  backfillPhotos,
  backfillLookalikes,
  backfillRemovalMethods,
} from "./db/seed";
import { bootstrapAdmin, requireAuth, requireAdmin, sweepExpiredSessions } from "./lib/auth";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { auditRouter } from "./routes/audit";
import { speciesRouter } from "./routes/species";
import { plantsRouter } from "./routes/plants";
import { treatmentsRouter } from "./routes/treatments";
import { photosRouter } from "./routes/photos";
import { exportRouter } from "./routes/export";
import { identifyRouter } from "./routes/identify";
import { ntfyRouter } from "./routes/ntfy";

export function createApp(): Express {
  migrate();
  seedIfEmpty();
  backfillSpeciesText();
  backfillPhotos();
  backfillLookalikes();
  backfillRemovalMethods();
  bootstrapAdmin();
  sweepExpiredSessions();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);

  app.use(requireAuth);

  app.use("/api/species", speciesRouter);
  app.use("/api/plants", plantsRouter);
  app.use("/api", treatmentsRouter);
  app.use("/api", photosRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/identify", identifyRouter);
  app.use("/api/users", usersRouter); // per-route admin (or admin-impersonating) checks inside
  app.use("/api/ntfy", requireAdmin, ntfyRouter);
  app.use("/api/audit-log", requireAdmin, auditRouter);

  return app;
}
