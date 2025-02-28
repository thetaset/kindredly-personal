import request from 'supertest';
import App from '../app';
import { ItemType, LoginType, UserType } from 'tset-sharedlib/shared.types';
import Knex from 'knex';
import { UserRepo } from '../db/user.repo';
import User  from '@/schemas/public/User';
import { AccountRepo } from '@/db/account.repo';
import Account from '@/schemas/public/Account';
import Item from '@/schemas/public/Item';
import { ItemRepo } from '@/db/item.repo';
jest.mock('bullmq');
jest.mock('../db/user.repo');
jest.mock('../db/account.repo');
jest.mock('../db/item.repo');
const app = new App().app;



describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('Create User', async () => {

    const quickBarCollection:Item={
      _id: 'ic_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }


    const user:User = {
      _id: 'u_123', username: 'mytestuser', email: 'testuser@example.com', type: UserType.admin,
      accountId: '',
      displayedName: '',
      publicId: '',
      password: '',
      options: undefined,
      loginType: LoginType.internal,
    };

    const account:Account = {
      _id: 'ac_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerUserId: '',
    }

    // Spy on UserRepo.prototype.findById to return a fake user
    jest.spyOn(UserRepo.prototype, 'where').mockReturnValue({first() {return null}} as any);
    jest.spyOn(UserRepo.prototype, 'findByEmail').mockResolvedValue(Promise.resolve(null));

    jest.spyOn(UserRepo.prototype, 'findById').mockResolvedValue(Promise.resolve(null));
    jest.spyOn(AccountRepo.prototype, 'findById').mockResolvedValue(Promise.resolve(account));
    jest.spyOn(UserRepo.prototype, 'listByAccountId').mockResolvedValue([]);
    jest.spyOn(UserRepo.prototype, 'create').mockResolvedValue(user);
    
    jest.spyOn(ItemRepo.prototype, 'create').mockResolvedValue(quickBarCollection);

    const response = await request(app).post('/v2.3/auth/register').send({
      username: 'mytestuser',
      email: 'testuser@example.com',
      type: user.type,
      password: 'password6796!',
    });

    expect(response.statusCode).toBe(201);

  },1000000);

});