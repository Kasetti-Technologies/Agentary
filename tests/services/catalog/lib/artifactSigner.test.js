// File: /tests/services/catalog/lib/artifactSigner.test.js

// Import the functions we want to test
const { sign, verify } = require('../../../../services/catalog/lib/artifactSigner');

// Mock the entire AWS KMS client library.
// This ensures we don't make real AWS calls during our unit test.
const { KMSClient, SignCommand } = require('@aws-sdk/client-kms');
jest.mock('@aws-sdk/client-kms');

// A sample SHA-384 digest to use for testing (as a Buffer)
const sampleDigest = Buffer.from('a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a', 'hex');
const fakeSignatureBytes = Buffer.from('fake-kms-signature-bytes');
const fakeSignatureBase64 = fakeSignatureBytes.toString('base64');

describe('Artifact Signer', () => {
    let mockSend;

    // Before each test, reset the mock and environment variables
    beforeEach(() => {
        // Clear any previous mock configurations
        jest.clearAllMocks();

        // Mock the 'send' method of the KMSClient
        mockSend = jest.fn();
        KMSClient.prototype.send = mockSend;

        // Set the required environment variable for the signer
        process.env.SIGNING_KEY_ID = 'alias/test-signing-key';
    });

    describe('sign()', () => {
        it('should correctly sign a payload and return a base64 signature on success', async () => {
            // Arrange: Configure the mock to return a successful response
            mockSend.mockResolvedValue({
                Signature: fakeSignatureBytes,
            });

            // Act: Call the sign function
            const signature = await sign(sampleDigest);

            // Assert: Check that the result is correct and mocks were called
            expect(signature).toBe(fakeSignatureBase64);
            expect(mockSend).toHaveBeenCalledTimes(1);
            
            // Optional: Check that the correct parameters were sent to KMS
            const signCommand = mockSend.mock.calls[0][0];
            expect(signCommand.input).toEqual({
                KeyId: 'alias/test-signing-key',
                Message: sampleDigest,
                SigningAlgorithm: 'ECDSA_SHA_384',
                MessageType: 'DIGEST',
            });
        });

        it('should throw an error if the KMS signing fails', async () => {
            // Arrange: Configure the mock to simulate a failure
            const kmsError = new Error('KMS signing failed');
            mockSend.mockRejectedValue(kmsError);

            // Act & Assert: Expect the sign function to reject with an error
            await expect(sign(sampleDigest)).rejects.toThrow('Failed to sign artifact using KMS.');
        });

        it('should throw an error if the SIGNING_KEY_ID is not configured', async () => {
            // Arrange: Unset the environment variable
            delete process.env.SIGNING_KEY_ID;

            // Act & Assert: Expect the function to throw a configuration error
            await expect(sign(sampleDigest)).rejects.toThrow('Signing key ID is not configured. Cannot sign artifact.');
        });
    });

    describe('verify()', () => {
        it('should return true as it is a placeholder', async () => {
            // This test just confirms the placeholder behavior.
            // When you implement the real verification, this test will change.
            const result = await verify(sampleDigest, 'any-signature');
            expect(result).toBe(true);
        });
    });
});
