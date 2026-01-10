import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Octokit } from '@octokit/rest';
import { CustomActionContext } from '../customActionContext';
import { TemplateExample } from '@backstage/plugin-scaffolder-node';
import sodium from 'libsodium-wrappers';

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
                ctx.logger.warn('Docker credentials not found in config. Skipping setup.');
                ctx.logger.warn('Set company.docker.username and company.docker.token in app-config');
                return;
            }

            const envVariables = {
                DOCKER_USERNAME: dockerUsername,
            };

            const secrets = {
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
                
                // Try query parameter format first (github.com?owner=X&repo=Y)
                const ownerParam = url.searchParams.get('owner');
                const repoParam = url.searchParams.get('repo');
                if (ownerParam && repoParam) {
                    return { repoOwner: ownerParam, repo: repoParam };
                }
                
                // Try full URL format (https://github.com/owner/repo.git)
                const pathParts = url.pathname.split('/').filter(Boolean);
                if (pathParts.length >= 2) {
                    const owner = pathParts[0];
                    const repository = pathParts[1].replace(/\.git$/, '');
                    return { repoOwner: owner, repo: repository };
                }
                
                throw new Error(`Invalid repoUrl: ${repoUrl}`);
            })(normalizedUrl);

            for (const [name, value] of Object.entries(envVariables)) {
                ctx.logger.info(`Setting up variable: ${name}`);
                await octokit.actions.createRepoVariable({
                    owner: repoOwner,
                    repo: repo,
                    name: name,
                    value: value,
                });
                ctx.logger.info(`✓ Variable ${name} created`);
            }

            // Get the repository's public key for encrypting secrets
            const { data: publicKeyData } = await octokit.actions.getRepoPublicKey({
                owner: repoOwner,
                repo: repo,
            });

            await sodium.ready;

            for (const [name, value] of Object.entries(secrets)) {
                ctx.logger.info(`Setting up secret: ${name}`);

                const keyBytes = new Uint8Array(Buffer.from(publicKeyData.key, 'base64'));
                const encryptedBytes = sodium.crypto_box_seal(value, keyBytes);
                const encryptedValue = Buffer.from(encryptedBytes).toString('base64');

                await octokit.actions.createOrUpdateRepoSecret({
                    owner: repoOwner,
                    repo: repo,
                    secret_name: name,
                    encrypted_value: encryptedValue,
                    key_id: publicKeyData.key_id,
                });

                ctx.logger.info(`Secret ${name} created`);
            }

            ctx.logger.info(`All credentials set up successfully for ${repoOwner}/${repo}`);
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

