export default interface SysSetupService {
  getLimitsForAccount(id: string): Promise<any>;
  systemInfo(): Promise<{underAccountLimit: boolean; allowInviteCode: boolean | null}>;
  sendPushNotification(message: {
    apns: {payload: {aps: {alert: {title: string; body: string}}}};
    data: any;
    tokens: any[];
  }): void;
}
