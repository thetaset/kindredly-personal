import PluginService from '@/services/plugin.service';
import {Routes} from '@interfaces/routes.interface';
import {NextFunction, Router, Request, Response} from 'express';
import {ApiReq} from '@/types/api-types';
import {errorHelper} from '../utils/auth_utils';
import {config} from '@/config';
import SysSetupService from '@/services/_interfaces/syssetup.service';
import {inject, injectable} from 'inversify';
import {TYPES} from '@/types';
const indexRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

const versionReq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({success: true, results: config.version});
  } catch (error) {
    next(error);
  }
};

@injectable()
class SystemRoute implements Routes {
  public router = Router();

  private pluginService = new PluginService();
  constructor(@inject(TYPES.SetupService) private setupService: SysSetupService) {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.all('/system/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        console.log('systemStatus');
        const results = await this.setupService.systemInfo();
        res.status(201).json({success: true, message: 'request complete', results});
      } catch (error) {
        next(error);
      }
    });

    this.router.all('/system/version', versionReq);

    this.router.get('/', indexRequest);

    // SCH-FAILED
    this.router.post(
      '/plugin/list',
      errorHelper(async (req: ApiReq<'/plugin/list'>, res) => {
        const items = await this.pluginService.listSitePlugins();
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      }),
    );
  }
}

export default SystemRoute;
