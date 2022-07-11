import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export default function namespace(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return new k8s.core.v1.Namespace(
    'namespace',
    {
      metadata: {
        labels: {
          namespace: 'cerusbots',
        },
        name: 'cerusbots',
      },
    },
    { provider, dependsOn, protect: true }
  )
}
