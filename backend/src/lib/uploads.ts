import fs from "node:fs";
import path from "node:path";
import multer from "multer";

/** Shared upload location + multer instance for plant photos. */
export const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${req.params.id ?? "photo"}-${Date.now()}-${rand}${ext}`);
  },
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/** Delete an uploaded file given its public `/uploads/<name>` path. Best-effort. */
export function removeUploadedFile(publicPath: string | null | undefined): void {
  if (!publicPath) return;
  const name = publicPath.replace(/^\/uploads\//, "");
  if (!name || name.includes("/") || name.includes("..")) return;
  fs.rm(path.join(uploadsDir, name), { force: true }, () => {});
}
