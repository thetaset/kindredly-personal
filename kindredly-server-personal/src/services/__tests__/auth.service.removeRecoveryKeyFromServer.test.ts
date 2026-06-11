import { config } from '@/config'
import AuthService from '@/services/auth.service'
import { hashStringWithSalt } from '@/utils/crypto_util'

function makePasswordHash(password: string) {
  return hashStringWithSalt(password, String(config.passwordSalt))
}

describe('AuthService.removeRecoveryKeyFromServer', () => {
  it('rejects requests for another user even when the caller is authenticated', async () => {
    const service = new AuthService({} as any)

    await expect(
      service.removeRecoveryKeyFromServer(
        {
          currentUserId: 'actor-1',
          getUserById: jest.fn(),
        } as any,
        'target-1',
        { method: 'password', password: 'secret' },
      ),
    ).rejects.toThrow('This action is only available for the current user.')
  })

  it('rejects removal when the user has neither a password nor a passkey', async () => {
    const service = new AuthService({} as any)
    ;(service as any).passkeyService = {
      listPasskeys: jest.fn().mockResolvedValue([]),
      authenticatePasskey: jest.fn(),
    }

    await expect(
      service.removeRecoveryKeyFromServer(
        {
          currentUserId: 'user-1',
          getUserById: jest.fn().mockResolvedValue({ _id: 'user-1', password: null }),
        } as any,
        'user-1',
        { method: 'password', password: 'secret' },
      ),
    ).rejects.toThrow('Add a password or passkey before disabling Kindredly recovery.')
  })

  it('removes the stored recovery key after password verification', async () => {
    const service = new AuthService({} as any)
    const updateWithId = jest.fn().mockResolvedValue(true)
    ;(service as any).users = { updateWithId }
    ;(service as any).passkeyService = {
      listPasskeys: jest.fn().mockResolvedValue([]),
      authenticatePasskey: jest.fn(),
    }

    await expect(
      service.removeRecoveryKeyFromServer(
        {
          currentUserId: 'user-1',
          getUserById: jest.fn().mockResolvedValue({ _id: 'user-1', password: makePasswordHash('secret') }),
        } as any,
        'user-1',
        { method: 'password', password: 'secret' },
      ),
    ).resolves.toBeUndefined()

    expect(updateWithId).toHaveBeenCalledWith('user-1', { recoveryKey: null })
  })

  it('removes the stored recovery key after passkey verification', async () => {
    const service = new AuthService({} as any)
    const updateWithId = jest.fn().mockResolvedValue(true)
    const authenticatePasskey = jest.fn().mockResolvedValue({
      success: true,
      verified: true,
      userId: 'user-1',
    })
    ;(service as any).users = { updateWithId }
    ;(service as any).passkeyService = {
      listPasskeys: jest.fn().mockResolvedValue([{ credentialId: 'cred-1' }]),
      authenticatePasskey,
    }

    const passkeyRequest = {
      credentialId: 'cred-1',
      signature: 'sig',
      authenticatorData: 'auth',
      clientDataJSON: 'client',
    }

    await expect(
      service.removeRecoveryKeyFromServer(
        {
          currentUserId: 'user-1',
          getUserById: jest.fn().mockResolvedValue({ _id: 'user-1', password: null }),
        } as any,
        'user-1',
        { method: 'passkey', passkey: passkeyRequest },
      ),
    ).resolves.toBeUndefined()

    expect(authenticatePasskey).toHaveBeenCalledWith(passkeyRequest, {
      expectedOperation: 'remove-recovery-key',
      expectedUserId: 'user-1',
    })
    expect(updateWithId).toHaveBeenCalledWith('user-1', { recoveryKey: null })
  })
})