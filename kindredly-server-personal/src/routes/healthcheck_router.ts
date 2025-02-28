import { config } from '@/config';
import {Routes} from '@interfaces/routes.interface';
import { NextFunction, Router, Request, Response } from 'express';

export enum HealthCheckPaths {
  PING = '/healthcheckping',
}
const versionReq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({success: true, results: config.version});
  } catch (error) {
    next(error);
  }
};
class HealthCheckRouter implements Routes {
  
  public router = Router();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {

    // SCH-OK
    this.router.all(HealthCheckPaths.PING, versionReq);
  }
}

export default HealthCheckRouter;
