import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import deepmerge from 'deepmerge'
import { Configuration } from '../config'

const baseResource: k8s.types.input.apiextensions.v1.JSONSchemaProps = {
  properties: {
    apiVersion: {
      description:
        'APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources',
      type: 'string',
    },
    kind: {
      description:
        'Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds',
      type: 'string',
    },
    metadata: {
      type: 'object',
    },
  },
  required: ['spec', 'metadata'],
  type: 'object',
}

const botCode: k8s.types.input.apiextensions.v1.JSONSchemaProps = {
  description:
    'BotCode defines what code should be loaded into this particular bot resource.',
  type: 'object',
  properties: {
    fromString: {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
      required: ['value'],
    },
    fromRepo: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        repo: { type: 'string' },
        ref: { type: 'string' },
      },
      required: ['path', 'repo', 'ref'],
    },
  },
  maxItems: 1,
  minItems: 1,
}

export const botComamndResource = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apiextensions.v1.CustomResourceDefinition(
    'cerus-bot-command-resource',
    {
      metadata: {
        name: 'botcommands.cerusbots.com',
        namespace: config.namespace,
      },
      spec: {
        group: 'cerusbots.com',
        names: {
          categories: ['cerusbots'],
          kind: 'BotCommand',
          listKind: 'BotCommandList',
          plural: 'botcommands',
          shortNames: ['botcmd'],
          singular: 'botcommand',
        },
        scope: 'Namespaced',
        versions: [
          {
            name: 'v1alpha1',
            schema: {
              openAPIV3Schema: deepmerge(baseResource, {
                description:
                  'BotCommand defines a namespaced command definition',
                properties: {
                  spec: {
                    type: 'object',
                    description:
                      'BotCommandSpec is a specification for the desired bot configuration',
                    properties: {
                      description: {
                        type: 'string',
                      },
                      code: botCode,
                      name: {
                        type: 'string',
                      },
                    },
                    required: ['description', 'code', 'name'],
                  },
                },
              }),
            },
            served: true,
            storage: true,
          },
        ],
      },
    },
    { provider, dependsOn }
  )

export const botMessageHookResource = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apiextensions.v1.CustomResourceDefinition(
    'cerus-bot-messagehook-resource',
    {
      metadata: {
        name: 'botmessagehooks.cerusbots.com',
        namespace: config.namespace,
      },
      spec: {
        group: 'cerusbots.com',
        names: {
          categories: ['cerusbots'],
          kind: 'BotMessageHook',
          listKind: 'BotMessageHookList',
          plural: 'botmessagehooks',
          shortNames: ['botmsghk', 'botmsghook'],
          singular: 'botmessagehook',
        },
        scope: 'Namespaced',
        versions: [
          {
            name: 'v1alpha1',
            schema: {
              openAPIV3Schema: deepmerge(baseResource, {
                description:
                  'BotMessageHook defines a namespaced message hook.',
                properties: {
                  spec: {
                    type: 'object',
                    description:
                      'BotMessageHookSpec is a specification for the desired bot configuration',
                    properties: {
                      code: botCode,
                      regex: {
                        type: 'string',
                        format: 'regex',
                      },
                    },
                    required: ['code', 'regex'],
                  },
                },
              }),
            },
            served: true,
            storage: true,
          },
        ],
      },
    },
    { provider, dependsOn }
  )

export default function crds(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return [
    botComamndResource(config, provider, dependsOn),
    botMessageHookResource(config, provider, dependsOn),
  ]
}
