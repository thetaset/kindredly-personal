export default interface SysSetupService {
  getLimitsForAccount(id: string): Promise<any>;
  systemInfo(): Promise<{underAccountLimit: boolean; allowInviteCode: boolean | null}>;
  /**
   * Two shapes go through here, and the difference is not cosmetic.
   *
   * A NOTIFICATION carries an `alert` and shows a banner. A SILENT push carries
   * `content-available` with no alert, wakes the app, and shows the user nothing — that is
   * how a parent's block reaches a child's phone without announcing itself to the child
   * (UX-019). APNs rejects `content-available` at priority 10, hence `headers`.
   */
  sendPushNotification(message: {
    apns: {
      headers?: Record<string, string>;
      payload: {aps: {alert?: {title: string; body: string}; 'content-available'?: number}};
    };
    android?: {priority?: 'normal' | 'high'};
    data: any;
    tokens: any[];
  }): void;
}
