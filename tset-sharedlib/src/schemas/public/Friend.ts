
export default  interface Friend {
  _id?: string;


  accountId?: string | null;

  userId?: string | null;

  friendUserId?: string | null;

  nickname?: string | null;

  createdAt?: Date | null;

  requester?: boolean | null;

  confirmed?: boolean | null;

  denied?: boolean | null;
}
