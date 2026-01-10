
import { Config } from '@backstage/config';
import { ScmIntegrations } from '@backstage/integration';

export interface CustomActionContext {
    integrations: ScmIntegrations;
    config: Config;
}

export const createCustomActionContext = (config: Config): CustomActionContext => {
    return {
        integrations: ScmIntegrations.fromConfig(config),
        config: config,
    };
};