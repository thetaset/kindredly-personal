export default interface UserPref {
  _id?: string;
  userId?: string;
  key?: string;
  value?: Record<string, any> | null;
  updatedAt?: Date | null;
}

export const userPrefDefaults = {
  notificationSettings: {
    categories: {
      NEW_COMMENT: {
        email: true,
        push: true,
      },
      NEW_POST: {
        email: true,
        push: true,
      },
      FRIEND_REQUEST: {
        email: true,
        push: true,
      },
      SHARED_ITEM: {
        email: true,
        push: true,
      },
      NEW_ITEM: {
        email: true,
        push: false,
      },
      // A child asking for access is blocking on an answer, so it needs its own
      // entry to escape DEFAULT's push: false — without one the parent learned of
      // a request only by opening the app or checking mail, while the child got a
      // push the moment it was answered. Both channels start on; the row in
      // Notification Settings lets each guardian turn either off.
      ACCESS_REQUEST: {
        email: true,
        push: true,
      },
      ACCESS_REQUEST_UPDATE: {
        email: true,
        push: true,
      },
      // A child's Guard device was tampered with or went dark. Needs its own entry
      // because an unlisted type falls through to DEFAULT, which is push: false —
      // this alert is time-critical and must not be silent by default.
      DEVICE_PROTECTION_ALERT: {
        email: true,
        push: true,
      },
      // New apps on a child's phone. Push on, email off: it is worth a glance when
      // it happens and worthless a day later, and routine enough that mailing every
      // batch would train parents to filter the whole sender.
      DEVICE_APP_REVIEW: {
        email: false,
        push: true,
      },
      // The assistant answering a request on a parent's behalf. Both channels
      // start OFF, unlike every other entry here, and deliberately: a parent who
      // switched this feature on asked for requests to stop reaching them, so
      // mailing and pushing every one would undo what they asked for. The row
      // exists so a parent who does want to watch it can, which is the founder's
      // "an option to send a notification" (2026-09-07). The in-app notice is
      // written either way and is not governed by this.
      LIBRARY_AUTO_APPROVAL_APPROVED: {
        email: false,
        push: false,
      },
      // What a curator found after you reported a catalog item. Push on, email off: the
      // person asked a question and is waiting on the answer, but it is not urgent mail.
      CURATION_REVIEW_RESULT: {
        email: false,
        push: true,
      },
      DEFAULT: {
        email: true,
        push: false,
      }
    },
  },
};
