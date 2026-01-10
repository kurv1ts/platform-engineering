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

            // Environments to configure
            const environments = ['dev', 'prod'];

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

            await sodium.ready;

            // Get repository ID (required for environment APIs)
            const { data: repoData } = await octokit.repos.get({
                owner: repoOwner,
                repo: repo,
            });
            const repositoryId = repoData.id;

            for (const env of environments) {
                ctx.logger.info(`Configuring environment: ${env}`);


                try {
                    await octokit.repos.createOrUpdateEnvironment({
                        owner: repoOwner,
                        repo: repo,
                        environment_name: env,
                    });
                    ctx.logger.info(`✓ Environment ${env} ready`);
                } catch (error: any) {
                    ctx.logger.warn(`Could not create environment ${env}: ${error.message}`);
                }


                for (const [name, value] of Object.entries(envVariables)) {
                    try {
                        ctx.logger.info(`Setting up variable ${name} for ${env}`);
                        await octokit.actions.createEnvironmentVariable({
                            repository_id: repositoryId,
                            environment_name: env,
                            name: name,
                            value: value,
                        });
                        ctx.logger.info(`✓ Variable ${name} created for ${env}`);
                    } catch (error: any) {
                        ctx.logger.warn(`Could not create variable ${name} for ${env}: ${error.message}`);
                    }
                }

                const { data: envPublicKey } = await octokit.actions.getEnvironmentPublicKey({
                    repository_id: repositoryId,
                    environment_name: env,
                });


                for (const [name, value] of Object.entries(secrets)) {
                    ctx.logger.info(`Setting up secret ${name} for ${env}`);

                    const keyBytes = new Uint8Array(Buffer.from(envPublicKey.key, 'base64'));
                    const encryptedBytes = sodium.crypto_box_seal(value, keyBytes);
                    const encryptedValue = Buffer.from(encryptedBytes).toString('base64');

                    await octokit.actions.createOrUpdateEnvironmentSecret({
                        repository_id: repositoryId,
                        environment_name: env,
                        secret_name: name,
                        encrypted_value: encryptedValue,
                        key_id: envPublicKey.key_id,
                    });

                    ctx.logger.info(`Secret ${name} created for ${env}`);
                }
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

