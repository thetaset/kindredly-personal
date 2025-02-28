import { Container } from 'inversify';
import AuthValidatorService from './services/_interfaces/auth_validator.service';
import SetupService from './services/_interfaces/syssetup.service';
import SubscriptionManagerService from './services/_interfaces/subscription_manager.service';
import OpenAuthValidatorService from './services/_open/open_auth.validator.service';
import OpenSetupService from './services/_open/open_setup.service';
import OpenSubscriptionManagerService from './services/_open/open_subscription_list.service';
import { TYPES } from './types';
import { UserFileAccessProvider } from './base/user_fileaccess.provider';
import { UserFileAccessProviderFS } from './base/user_fileaccess.provider.fs';


const container = new Container();
container.bind<SetupService>(TYPES.SetupService).to(OpenSetupService);
container.bind<AuthValidatorService>(TYPES.AuthValidatorService).to(OpenAuthValidatorService);
container.bind<SubscriptionManagerService>(TYPES.SubscriptionManagementService).to(OpenSubscriptionManagerService);
container.bind<UserFileAccessProvider>(TYPES.UserFileAccessProvider).to(UserFileAccessProviderFS);

export { container };
