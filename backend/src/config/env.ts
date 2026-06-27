import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env: requireEnv("NODE_ENV", "development"),
  port: parseInt(requireEnv("PORT", "4000"), 10),
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: requireEnv("JWT_EXPIRES_IN", "8h"),
  corsOrigin: requireEnv("CORS_ORIGIN", "http://localhost:5173"),
};
