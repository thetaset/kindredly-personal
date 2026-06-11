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
      ACCESS_REQUEST_UPDATE: {
        email: true,
        push: true,
      },
      FEATURE_UPDATE: {
        email: true,
        push: false,
      },
      DEFAULT: {
        email: true,
        push: false,
      }
    },
  },
};
