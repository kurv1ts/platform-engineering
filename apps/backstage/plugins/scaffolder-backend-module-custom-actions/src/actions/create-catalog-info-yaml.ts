import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';
import { Octokit } from '@octokit/rest';
import { CustomActionContext } from '../customActionContext';
import { TemplateExample } from '@backstage/plugin-scaffolder-node';
/**
 * Creates a custom Scaffolder action to add catalog-info.yaml.
 *
 * @public
 */
export function createCatalogInfoHandlerAction(customActionContext: CustomActionContext) {
    return createTemplateAction({
        id: 'template:catalog-info-handler',
        description: 'Adds correct catalog-info.yaml to the template',
        examples,
        schema: {
            input: {
                componentName: z =>
                    z.string({
                        description: 'Name of the component',
                    }),
                team: z =>
                    z.string({
                        description: 'Team who owns the service',
                    }),
                repoUrl: z =>
                    z.string({
                        description: 'URL to the repository',
                    }),
            },
        },
        async handler(ctx) {
            ctx.logger.info(
                `## Running catalog-info handler with parameters: ${JSON.stringify(ctx.input)}`,
            );

            const templateInfo = ctx.templateInfo;
            const templateSpecType = templateInfo?.entity;

            ctx.logger.info(`## Template name: ${templateInfo?.entityRef}`);
            ctx.logger.info(`## Template spec type: ${JSON.stringify(templateSpecType)}`);

            const team = ctx.input.team.split("/").pop() ?? ctx.input.team;

            const catalogInfo = {
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Component',
                metadata: {
                    name: ctx.input.componentName as string,
                    description: `A component created by ${team}`,
                },
                spec: {
                    type: /* (templateSpecType as string) ||*/ 'service',
                    owner: team,
                    lifecycle: 'experimental',
                },
            };

            const { repoUrl } = ctx.input;
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

            await octokit.repos.createOrUpdateFileContents({
                owner: repoOwner,
                repo: repo,
                path: 'catalog-info.yaml',
                message: 'Add catalog-info.yaml',
                content: Buffer.from(yaml.stringify(catalogInfo)).toString('base64'),
                branch: 'main',
            });
        },
    });
}

export const examples: TemplateExample[] = [
    {
        description: 'Adds catalog-info.yaml to the template.',
        example: yaml.stringify({
            steps: [
                {
                    id: 'catalog-info-handler',
                    action: 'template:catalog-info-handler',
                    name: 'Add catalog-info.yaml to the template',
                    input: {
                        repoUrl: 'github.com?repo=repo&owner=owner',
                        name: 'Component name',
                        owner: 'Team name',
                    },
                },
            ],
        }),
    }
];