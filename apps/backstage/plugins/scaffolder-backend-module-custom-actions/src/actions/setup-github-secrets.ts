import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Octokit } from '@octokit/rest';
import { CustomActionContext } from '../customActionContext';
import { TemplateExample } from '@backstage/plugin-scaffolder-node';
import nacl from 'tweetnacl';

/**
 * Creates a custom Scaffolder action to set up GitHub repository secrets.
 *
 * @public
 */
export function createSetupGithubSecretsAction(customActionContext: CustomActionContext) {
    return createTemplateAction({
        id: 'template:setup-github-secrets',
        description: 'Sets up required GitHub repository secrets for CI/CD workflows',
        examples,
        schema: {
            input: {
                repoUrl: z =>
                    z.string({
                        description: 'URL to the repository',
                    }),
            },
        },
        async handler(ctx) {
            ctx.logger.info(
                `## Setting up GitHub secrets for repository: ${ctx.input.repoUrl}`,
            );

            const { repoUrl } = ctx.input;
            
            // Read Docker credentials from Backstage config
            const config = customActionContext.config;
            const dockerUsername = config.getOptionalString('company.docker.username');
            const dockerToken = config.getOptionalString('company.docker.token');

            if (!dockerUsername || !dockerToken) {
                ctx.logger.warn('Docker credentials not found in config. Skipping secret setup.');
                ctx.logger.warn('Set company.docker.username and company.docker.token in app-config');
                return;
            }

            const secrets = {
                DOCKER_USERNAME: dockerUsername,
                DOCKER_TOKEN: dockerToken,
            };

            const normalizedUrl = (repoUrl as string).includes('://') ? (repoUrl as string) : `https://${repoUrl}`;
            const integration = customActionContext.integrations.byUrl(normalizedUrl);

            if (!integration || integration.type !== 'github') {
                throw new Error(`No GitHub integration found for ${repoUrl}`);
            }

            const { token, apiBaseUrl } = (integration as any).config;

            if (!token) {
                throw new Error(`No token found for GitHub integration`);
            }

            const octokit = new Octokit({
                auth: token,
                baseUrl: apiBaseUrl,
            });

            const { repoOwner, repo } = ((urlStr: string) => {
                const url = new URL(urlStr);
                const ownerParam = url.searchParams.get('owner');
                const repoParam = url.searchParams.get('repo');
                if (ownerParam && repoParam) {
                    return { repoOwner: ownerParam, repo: repoParam };
                }
                throw new Error(`Invalid repoUrl: ${repoUrl}`);
            })(normalizedUrl);

            // Get the repository's public key for encrypting secrets
            const { data: publicKeyData } = await octokit.actions.getRepoPublicKey({
                owner: repoOwner,
                repo: repo,
            });

            // Encrypt and create each secret
            for (const [secretName, secretValue] of Object.entries(secrets)) {
                ctx.logger.info(`Setting up secret: ${secretName}`);

                // Convert the secret and key to Uint8Array  
                const messageBytes = new Uint8Array(Buffer.from(secretValue));
                const keyBytes = new Uint8Array(Buffer.from(publicKeyData.key, 'base64'));

                // Encrypt using tweetnacl's sealed box (crypto_box_seal equivalent)
                const nonce = new Uint8Array(nacl.box.nonceLength);
                const encryptedBytes = nacl.box(messageBytes, nonce, keyBytes, keyBytes);
                const encryptedValue = Buffer.from(encryptedBytes).toString('base64');

                // Create or update the secret
                await octokit.actions.createOrUpdateRepoSecret({
                    owner: repoOwner,
                    repo: repo,
                    secret_name: secretName,
                    encrypted_value: encryptedValue,
                    key_id: publicKeyData.key_id,
                });

                ctx.logger.info(`✓ Secret ${secretName} created successfully`);
            }

            ctx.logger.info(`All secrets set up successfully for ${repoOwner}/${repo}`);
        },
    });
}

export const examples: TemplateExample[] = [
    {
        description: 'Sets up GitHub repository secrets from Backstage config.',
        example: `
steps:
  - id: setup-secrets
    action: template:setup-github-secrets
    name: Setup GitHub Secrets
    input:
      repoUrl: github.com?repo=my-repo&owner=my-org
`,
    }
];

