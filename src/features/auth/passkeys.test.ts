import { withoutNulls } from '@/features/auth/passkeys';

test("the device's empty optional fields are left out, the rest kept", () => {
  // What the iOS module answers for a new passkey (values shortened).
  expect(
    withoutNulls({
      id: 'c1',
      type: 'public-key',
      authenticatorAttachment: null,
      clientExtensionResults: {},
      response: {
        clientDataJSON: 'e30',
        attestationObject: 'o2N',
        transports: null,
        authenticatorData: null,
        publicKeyAlgorithm: null,
      },
    }),
  ).toEqual({
    id: 'c1',
    type: 'public-key',
    clientExtensionResults: {},
    response: { clientDataJSON: 'e30', attestationObject: 'o2N' },
  });
});
