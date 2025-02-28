
export default interface SysSetupService {

    getLimitsForAccount(id: string): Promise<any>;
    systemInfo(): Promise<any>;
    sendPushNotification(message: { apns: { payload: { aps: { alert: { title: string; body: string; }; }; }; }; data: any; tokens: any[]; }): void;
}

