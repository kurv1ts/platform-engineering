
import { Config } from '@backstage/config';
import { ScmIntegrations } from '@backstage/integration';

export interface CustomActionContext {
    integrations: ScmIntegrations;
}

export const createCustomActionContext = (config: Config): CustomActionContext => {
    return {
        integrations: ScmIntegrations.fromConfig(config),
    };
};