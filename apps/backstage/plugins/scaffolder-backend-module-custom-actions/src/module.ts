import { createBackendModule } from "@backstage/backend-plugin-api";
import { createCatalogInfoHandlerAction } from "./actions/create-catalog-info-yaml";
import { createCustomActionContext } from "./customActionContext";
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { coreServices } from '@backstage/backend-plugin-api';

/**
 * A backend module that registers the action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'custom-actions',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig
      },
      async init({ scaffolderActions, config }) {
        scaffolderActions.addActions(createCatalogInfoHandlerAction(createCustomActionContext(config)));
      }
    });
  },
});
