import { config } from "@/config";

import SystemRoute from "@/routes/system.route";
import { logger, stream } from "@/utils/logger";
import { Routes } from "@interfaces/routes.interface";
import errorMiddleware from "@middlewares/error.middleware";
import AuthRoute from "@routes/auth.route";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import hpp from "hpp";
import knex from "./db/knex_config";

import AccessRequestRoute from "./routes/access_request.route";
import CommentRoute from "./routes/comment.route";
import HealthCheckRouter from "./routes/healthcheck_router";
import ItemRoute from "./routes/item.route";
import PostRoute from "./routes/post.route";
import SubscriptionRoute from "./routes/subscription.route";
import SyncRoute from "./routes/sync.route";
import UserActivityRoute from "./routes/user_activity.route";
import UserEncryptionRoute from "./routes/user_encryption.route";
import UserFeedRoute from "./routes/user_feed.route";
import FileDataRoute from "./routes/user_filedata.route";
import UserNotificationsRoute from "./routes/user_notifications.route";
import UserPrefsRoute from "./routes/user_prefs.route";
import PluginService from "./services/plugin.service";
import AccountRoute from "./routes/account.route";
import UserRoute from "./routes/user.route";
import ExternalDataRoute from "./routes/external_data.route";
import { container } from "@/inversify.config";

function skipLogging(req) {
  if (req.url.includes("/image/get")) {
    return true;
  }

  return false;
}
const TEST_MODE = process.env.NODE_ENV === "test";

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(routes: Routes[] = []) {


    this.app = express();
    this.env = config.env;
    this.port = config.port;




    this.initializeDB();
    this.initializeMiddlewares();

    this.initializeErrorHandling();

    if (config.env != "production" && routes.length > 0) {
      console.log("Running limited routes");
      this.initializeRoutes(routes);
    } else {

      const mainRoutes = [
        new AccessRequestRoute(),
        new AccountRoute(),
        new AuthRoute(),
        new CommentRoute(),
        new ExternalDataRoute(),
        new FileDataRoute(),
        new ItemRoute(),
        new PostRoute(),
        new SubscriptionRoute(),
        new SyncRoute(),
        container.resolve(SystemRoute),
        new UserActivityRoute(),
        new UserEncryptionRoute(),
        new UserFeedRoute(),
        new UserNotificationsRoute(),
        new UserPrefsRoute(),
        new UserRoute(),
      ];



      this.initializeRoutes([...mainRoutes]);
    }

    if (!TEST_MODE)
      this.loadData();
  }

  async loadData() {
    const pluginService = new PluginService();
    await pluginService.initialize();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private async initializeDB() {

    if (TEST_MODE) {
      return;
    }
    try {
      const response = await knex.raw("SELECT 1");
      if (response) console.log("Successfully connected to Postgres Server");
      return;
    } catch (e) {
      console.log("Failed to connect to Postgres Server", e);
      if (config.abortOnDbLaunchFailure) {
        console.error("Stopping process due to launch failure");
        console.error(e);
        throw e;
      }
      // console.error(e);
      // throw e
    }
  }

  private async initializeMiddlewares() {
    if (config.origin === "*" && !config.credentials) {
      console.log("Cors with origin(s):", config.origin);
      this.app.use(
        cors({ origin: config.origin, credentials: config.credentials })
      );
    } else {
      const origins = config.origins
      console.log(
        "Usering cors with orgin",
        origins,
        " credentials: ",
        config.credentials
      );

      this.app.use(
        cors({
          origin: origins,
          credentials: config.credentials,
        })
      );
    }

    //configure cors to allow from subdomains
    this.app.use((req, res, next) => {
      if (!["GET", "POST"].includes(req.method)) {
        return res.status(405).json({ message: "Method not allowed" });
      }
      next();
    });

    this.app.use(hpp());
    this.app.use(compression());
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ limit: "50mb", extended: true }));
    this.app.use(cookieParser(config.cookieSecret));
    this.app.disable("x-powered-by");
  }

  private initializeRoutes(routes: Routes[]) {
    this.app.use("/", new HealthCheckRouter().router);
    routes.forEach((route) => {
      this.app.use("/" + config.apiVersion, route.router);
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
