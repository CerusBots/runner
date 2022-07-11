import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { createKube } from './src/kube'
import { createConfig } from './src/config'

const cfg = createConfig(new pulumi.Config())
createKube(
  cfg,
  process.env.GENERATE_YAML
    ? new k8s.Provider('render-yaml', {
        renderYamlToDirectory: `../${cfg.name}`,
        namespace: cfg.namespace,
      })
    : new k8s.Provider('k8s', {
        kubeconfig: cfg.kubeConfig,
        namespace: cfg.namespace,
      })
)
