import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const serviceAccounts = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  ['csi-s3', 'csi-attacher-sa', 'csi-provisioner-sa'].map(
    (name) =>
      new k8s.core.v1.ServiceAccount(
        name,
        {
          metadata: {
            name: name,
            namespace: 'kube-system',
          },
        },
        { provider, dependsOn }
      )
  )

export const clusterRoles = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  Object.entries({
    'csi-s3': [
      {
        apiGroups: [''],
        resources: ['secrets'],
        verbs: ['get', 'list'],
      },
      {
        apiGroups: [''],
        resources: ['nodes'],
        verbs: ['get', 'list', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['namespaces'],
        verbs: ['get', 'list'],
      },
      {
        apiGroups: [''],
        resources: ['presistentvolumes'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: ['storage.k8s.io'],
        resources: ['volumeattachments'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
    ],
    'external-attacher-runner': [
      {
        apiGroups: [''],
        resources: ['secrets'],
        verbs: ['get', 'list'],
      },
      {
        apiGroups: [''],
        resources: ['events'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['persistentvolumes'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['nodes'],
        verbs: ['get', 'list', 'watch'],
      },
      {
        apiGroups: ['storage.k8s.io'],
        resources: ['volumeattachments'],
        verbs: ['get', 'list', 'watch', 'update', 'patch'],
      },
    ],
    'external-provisioner-runner': [
      {
        apiGroups: [''],
        resources: ['secrets'],
        verbs: ['get', 'list'],
      },
      {
        apiGroups: [''],
        resources: ['persistentvolumes'],
        verbs: ['get', 'list', 'watch', 'create', 'delete'],
      },
      {
        apiGroups: [''],
        resources: ['persistentvolumeclaims'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: ['storage.k8s.io'],
        resources: ['storageclasses'],
        verbs: ['get', 'list', 'watch'],
      },
      {
        apiGroups: [''],
        resources: ['events'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
    ],
  }).map(
    ([name, rules]) =>
      new k8s.rbac.v1.ClusterRole(
        name,
        {
          metadata: {
            name,
          },
          rules,
        },
        { provider, dependsOn }
      )
  )

export const clusterRoleBindings = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  Object.entries({
    'csi-s3': ['csi-s3', 'csi-s3'],
    'csi-attacher-role': ['csi-attacher-sa', 'external-attacher-runner'],
    'csi-provisioner-role': [
      'csi-provisioner-sa',
      'external-provisioner-runner',
    ],
  }).map(
    ([name, [subject, role]]) =>
      new k8s.rbac.v1.ClusterRoleBinding(
        name,
        {
          metadata: {
            name: name,
          },
          subjects: [
            {
              kind: 'ServiceAccount',
              name: subject,
              namespace: 'kube-system',
            },
          ],
          roleRef: {
            kind: 'ClusterRole',
            name: role,
            apiGroup: 'rbac.authorization.k8s.io',
          },
        },
        { provider, dependsOn }
      )
  )

export const services = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  ['csi-attacher-s3', 'csi-provisioner-s3'].map(
    (name) =>
      new k8s.core.v1.Service(
        name,
        {
          metadata: {
            name,
            namespace: 'kube-system',
            labels: {
              app: name,
            },
          },
          spec: {
            selector: {
              app: name,
            },
            ports: [{ name: 'csi-s3-dummy', port: 65535 }],
          },
        },
        { provider, dependsOn }
      )
  )

export const statefulSets = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  Object.entries({
    'csi-attacher-s3': {
      containers: [
        {
          name: 'csi-attacher',
          image: 'quay.io/k8scsi/csi-attacher:v2.2.0',
          imagePullPolicy: 'IfNotPresent',
          args: ['--v=4', '--csi-address=$(ADDRESS)'],
          env: [
            {
              name: 'ADDRESS',
              value: '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver/csi.sock',
            },
          ],
          volumeMounts: [
            {
              name: 'socket-dir',
              mountPath: '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver',
            },
          ],
        },
      ],
      volumes: [
        {
          name: 'socket-dir',
          hostPath: {
            path: '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver',
            type: 'DirectoryOrCreate',
          },
        },
      ],
      'csi-provisioner-s3': {
        containers: [
          {
            name: 'csi-provisioner',
            image: 'quay.io/k8scsi/csi-provisioner:v2.1.0',
            imagePullPolicy: 'IfNotPresent',
            args: ['--v=4', '--csi-address=$(ADDRESS)'],
            env: [
              {
                name: 'ADDRESS',
                value:
                  '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver/csi.sock',
              },
            ],
            volumeMounts: [
              {
                name: 'socket-dir',
                mountPath: '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver',
              },
            ],
          },
          {
            name: 'csi-s3',
            image: 'ctrox/csi-s3:v1.2.0-rc.2',
            args: [
              '--endpoint=$(CSI_ENDPOINT)',
              '--nodeid=$(NODE_ID)',
              '--v=4',
            ],
            env: [
              {
                name: 'CSI_ENDPOINT',
                value:
                  'unix:///var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver/csi.sock',
              },
              {
                name: 'NODE_ID',
                value: {
                  fieldRef: {
                    fieldPath: 'spec.nodeName',
                  },
                },
              },
            ],
            volumeMounts: [
              {
                name: 'socket-dir',
                mountPath: '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver',
              },
            ],
          },
        ],
        volumes: [{ name: 'socket-dir', emptyDir: {} }],
      },
    },
  }).map(
    ([name, value]) =>
      new k8s.apps.v1.StatefulSet(
        name,
        {
          metadata: {
            name,
            namespace: 'kube-system',
            labels: {
              app: name,
            },
          },
          spec: {
            serviceName: name,
            replicas: 1,
            selector: {
              matchLabels: {
                app: name,
              },
            },
            template: {
              metadata: {
                labels: {
                  app: name,
                },
              },
              spec: {
                serviceAccount: name,
                tolerations: [
                  {
                    key: 'node-role.kubernetes.io/master',
                    operator: 'Exists',
                  },
                ],
                ...value,
              },
            },
          },
        },
        { provider, dependsOn }
      )
  )

export const daemonSet = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apps.v1.DaemonSet(
    'csi-s3',
    {
      metadata: {
        name: 'csi-s3',
        namespace: 'kube-system',
        labels: {
          app: 'csi-s3',
        },
      },
      spec: {
        selector: {
          matchLabels: {
            app: 'csi-s3',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'csi-s3',
            },
          },
          spec: {
            serviceAccount: 'csi-s3',
            hostNetwork: true,
            dnsPolicy: 'ClusterFirstWithHostNet',
            containers: [
              {
                name: 'driver-registrar',
                image: 'quay.io/k8scsi/csi-node-driver-registrar:v1.2.0',
                args: [
                  '--kubelet-registration-path=$(DRIVER_REG_SOCK_PATH)',
                  '--v=4',
                  '--csi-address=$(ADDRESS)',
                ],
                env: [
                  {
                    name: 'ADDRESS',
                    value: '/csi/csi.sock',
                  },
                  {
                    name: 'DRIVER_REG_SOCK_PATH',
                    value:
                      '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver/csi.sock',
                  },
                  {
                    name: 'KUBE_NODE_NAME',
                    valueFrom: {
                      fieldRef: {
                        fieldPath: 'spec.nodeName',
                      },
                    },
                  },
                ],
                volumeMounts: [
                  {
                    name: 'plugin-dir',
                    mountPath: '/csi',
                  },
                  {
                    name: 'registration-dir',
                    mountPath: '/registration/',
                  },
                ],
              },
              {
                name: 'csi-s3',
                securityContext: {
                  privileged: true,
                  capabilities: {
                    add: ['SYS_ADMIN'],
                  },
                  allowPrivilegeEscalation: true,
                },
                image: 'ctrox/csi-s3:v1.2.0-rc.2',
                imagePullPolicy: 'Always',
                args: [
                  '--endpoint=$(CSI_ENDPOINT)',
                  '--nodeid=$(NODE_ID)',
                  '--v=4',
                ],
                env: [
                  {
                    name: 'CSI_ENDPOINT',
                    value: 'unix:///csi/csi.sock',
                  },
                  {
                    name: 'NODE_ID',
                    valueFrom: {
                      fieldRef: {
                        fieldPath: 'spec.nodeName',
                      },
                    },
                  },
                ],
                volumeMounts: [
                  {
                    name: 'plugin-dir',
                    mountPath: '/csi',
                  },
                  {
                    name: 'pods-mount-dir',
                    mountPath: '/var/lib/kubelet/pods',
                    mountPropagation: 'Bidirectional',
                  },
                  {
                    name: 'fuse-device',
                    mountPath: '/dev/fuse',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'registration-dir',
                hostPath: {
                  path: '/var/lib/kubelet/plugins_registry/',
                  type: 'DirectoryOrCreate',
                },
              },
              {
                name: 'plugin-dir',
                hostPath: {
                  path: '/var/lib/kubelet/plugins/ch.ctrox.csi.s3-driver',
                  type: 'DirectoryOrCreate',
                },
              },
              {
                name: 'pods-mount-dir',
                hostPath: {
                  path: '/var/lib/kubelet/pods',
                  type: 'Directory',
                },
              },
              {
                name: 'fuse-device',
                hostPath: {
                  path: '/dev/fuse',
                },
              },
            ],
          },
        },
      },
    },
    { provider, dependsOn }
  )

export const storageClass = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.storage.v1.StorageClass(
    'cerus-csi-s3',
    {
      metadata: {
        name: 'cerus-csi-s3',
      },
      provisioner: 'ch.ctrox.csi.s3-driver',
      parameters: {
        mounter: 'rclone',
        usePrefix: 'true',
        prefix: 'cerus-',
      },
    },
    { provider, dependsOn }
  )

export const secret = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.core.v1.Secret('cerus-csi-s3', {
    metadata: {
      name: 'cerus-csi-s3',
      namespace: 'kube-system',
    },
    stringData: {
      accessKeyId: `"${config.minio.user.name}"`,
      secretAccessKey: config.minio.user.password.apply(
        (value) => `"${value}"`
      ),
      endpoint: `"http://cerus-minio.${config.namespace}.svc.cluster.local:9000"`,
    },
  })

export default function csi(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  const serviceAccountsRes = serviceAccounts(config, provider, dependsOn)
  const clusterRolesRes = clusterRoles(config, provider, dependsOn)
  const clusterRoleBindingsRes = clusterRoleBindings(config, provider, [
    ...dependsOn,
    ...clusterRolesRes,
  ])
  const statefulSetsRes = statefulSets(config, provider, [
    ...dependsOn,
    ...clusterRoleBindingsRes,
  ])
  const servicesRes = services(config, provider, [
    ...dependsOn,
    ...statefulSetsRes,
    ...serviceAccountsRes,
  ])
  const daemonSetRes = daemonSet(config, provider, [
    ...dependsOn,
    ...servicesRes,
    ...serviceAccountsRes,
  ])
  const secretRes = secret(config, provider, dependsOn)
  const storageClassRes = storageClass(config, provider, [
    ...dependsOn,
    daemonSetRes,
    secretRes,
  ])
  return storageClassRes
}
