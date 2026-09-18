import {config} from '@/config';
import {getBoxCaSha256} from '@/base/box_tls';
import {getAnnouncedHostname} from '@/base/box_announce';
import {Routes} from '@interfaces/routes.interface';
import {NextFunction, Router, Request, Response} from 'express';

export enum HealthCheckPaths {
  PING = '/healthcheckping',
}
const versionReq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // A box adds its authority's fingerprint (BOX-3) so the Companion can pin the file it
    // downloads before installing it (BOX-4), and the name it announced (BOX-1) so the app can
    // tell a family which address to use on other devices. Absent on the cloud; clients key on
    // serverVersion.
    const boxCaSha256 = getBoxCaSha256();
    const boxName = getAnnouncedHostname();
    const results =
      boxCaSha256 || boxName
        ? {...config.version, ...(boxCaSha256 ? {boxCaSha256} : {}), ...(boxName ? {boxName: `${boxName}.local`} : {})}
        : config.version;
    res.status(200).json({success: true, results});
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
