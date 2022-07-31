import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export default function ingress(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return new k8s.networking.v1.Ingress(
    'cerus-ingress-internal',
    {
      metadata: {
        name: 'cerus-ingress-internal',
        namespace: config.namespace,
        annotations: {
          'kubernetes.io/ingress.class': 'nginx',
        },
      },
      spec: {
        rules: [
          {
            host: 'db.internal.cerusbots.test',
            http: {
              paths: [
                {
                  backend: {
                    service: {
                      name: 'cerus-db-mariadb-primary',
                      port: {
                        name: 'mysql',
                        number: 3306,
                      },
                    },
                  },
                  pathType: 'Prefix',
                  path: '/',
                },
              ],
            },
          },
        ],
      },
    },
    { provider, dependsOn }
  )
}
