import dotenv from "dotenv";

import { DynObj } from "@/types";
import fs from "fs";
import os from "os";
import path from "path";
import process from "process";

const environment = process.env.NODE_ENV || "production";
console.log("Node JS Version", process.version);
console.log("Environment: ", environment);
console.log("Project Current Directory: ", __dirname);

function getEnvPath() {
  const envFilepath =
    environment == "production"
      ? path.resolve(__dirname, ".env")
      : path.resolve(__dirname, `../.env.${environment || "development"}`);

  return envFilepath;
}

const envFilepath = getEnvPath();
console.log("ENV file path: ", envFilepath);
if (fs.existsSync(envFilepath)) {
  console.log(" ENV File Found, loading");
  dotenv.config({ path: envFilepath });
} else {
  console.log(`env file not found at ${envFilepath}`);
  dotenv.config();
}

let dbconfig: DynObj = {
  client: "postgresql",
  connection: {
    host: process.env.DB_HOSTNAME || "localhost",
    database: process.env.DB_DBNAME || "kindredlydb",
    user: process.env.DB_AUTH_USER || "postgres",
    password: process.env.DB_AUTH_PASS || "test",

    port: process.env.DB_PORT || "5432",
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: "knex_migrations",
  },
};

const storageType = process.env.USER_STORAGE_TYPE || "s3";
const live = process.env.IS_LIVE === "true";
const serverHostname = process.env.SERVER_HOSTNAME;

// fail if ENV missing for the following
if (!process.env.PASSWORD_STORAGE_ENCRYPTION_KEY) {
  console.error("PASSWORD_STORAGE_ENCRYPTION_KEY is missing from ENV");
  // process.exit(1);
}

const MAJOR_VERSION = "2.3";
const MINOR_VERSION = "7";
const SERVER_VERSION = MAJOR_VERSION + "." + MINOR_VERSION;

const API_VERSION = "v" + MAJOR_VERSION;



let devMode = environment == "development"
const config = {
  env: environment,
  version: {
    serverVersion: SERVER_VERSION,
    versionMessage: null,
    supportedVersions: ["2.3"],
  },

  devMode: devMode,
  enableEmailMessaging: !devMode,
  port: process.env.PORT || 3000,
  serverHostname: serverHostname,
  db: dbconfig,
  abortOnDbLaunchFailure: process.env.ABORT_ON_DB_LAUNCH_FAILURE === "true",
  apiVersion: API_VERSION,
  syncSubscriptions: !devMode,
  live: live,
  jwtAccessTokenSecret:
    process.env.JWT_ACCESS_TOKEN_SECRET || "HJKH89sd987uasjnf43298",
  passwordStorageEncryptionKey:
    process.env.PASSWORD_STORAGE_ENCRYPTION_KEY || "0987654321098765432111",
  passwordSalt: process.env.PASSWORD_SALT || "TESTSALT",
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
  },

  inviteAccountExpMin: 60 * 48, // 7 days
  aiConfig: {
    type: process.env.AI_CONFIG_TYPE || "openai",
    secretKey: process.env.AI_CONFIG_SECRET_KEY || "sk-1234",
  },

  imageStorage: {
    type: storageType,
    bucket: process.env.IMAGE_STORAGE_BUCKET || "thetasetappdata",
    path:
      storageType == "fs"
        ? path.join(os.homedir(), "ThetaSetData", "images")
        : process.env.IMAGE_STORAGE_PATH || "public/images_testing",
  },

  pubStorage: {
    type: storageType,
    bucket: process.env.IMAGE_STORAGE_BUCKET || "thetasetappdata",
    path:
      storageType == "fs"
        ? path.join(os.homedir(), "ThetaSetData", "pubfiles")
        : process.env.IMAGE_STORAGE_PATH || "public/pubfiles_testing",
  },

  userStorage: {
    type: storageType,
    bucket: process.env.USER_STORAGE_BUCKET || "thetasetappdata",
    path:
      storageType == "fs"
        ? path.join(os.homedir(), "ThetaSetData", "userData")
        : process.env.USER_STORAGE_PATH || "userData",
  },

  adminEmail: process.env.ADMIN_EMAIL,
  adminWatchNotifications: process.env.ADMIN_WATCH_NOTIFICATIONS === "true",
  adminConsoleEnabled: process.env.ADMIN_CONSOLE_ENABLED === "true",
  adminConsoleUser: "admin",
  notificationSourceEmailString: process.env.NOTIFICATION_SOURCE_EMAIL_STRING ,

  maxFileSize: 60 * 1024 * 1024, // 40MB
  cookieSecret: process.env.COOKIE_SECRET || "jaklsdfjalsdf",
  origin: process.env.ORIGIN || "http://localhost:4444",
  logDir: process.env.LOG_DIR
    ? process.env.LOG_DIR
    : path.join(os.homedir(), process.env.LOG_DIR || "thetaset_server_logs"),
  logFormat: process.env.LOG_FORMAT,
  logToFiles: process.env.LOG_TO_FILES === "true",
  credentials: true, 
  visitCountThresholdSec: 15 * 60,
  privateServer: true,

};

console.log(`****Server Config Loaded for ${serverHostname}****`);

console.log("Config", config);

export { config };
