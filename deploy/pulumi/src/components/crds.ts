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

const user: k8s.types.input.apiextensions.v1.JSONSchemaProps = {
  type: 'object',
  properties: {
    discordID: {
      type: 'string',
    },
    apiUID: {
      type: 'string',
    },
  },
  maxItems: 1,
  minItems: 1,
}

const botTeamMember: k8s.types.input.apiextensions.v1.JSONSchemaProps = {
  type: 'object',
  properties: {
    ...user.properties,
    role: {
      type: 'string',
    },
  },
  required: ['role'],
  maxItems: 2,
  minItems: 2,
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
        url: { type: 'string' },
        ref: { type: 'string' },
      },
      required: ['url'],
    },
  },
  maxItems: 1,
  minItems: 1,
}

const botCommand: k8s.types.input.apiextensions.v1.JSONSchemaProps = deepmerge(
  baseResource,
  {
    description: 'BotCommand defines a namespaced command definition',
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
  }
)

const botMessageHook: k8s.types.input.apiextensions.v1.JSONSchemaProps =
  deepmerge(baseResource, {
    description: 'BotMessageHook defines a namespaced message hook.',
    properties: {
      spec: {
        type: 'object',
        description:
          'BotMessageHookSpec is a specification for the desired message hook configuration',
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
  })

const botWebhook: k8s.types.input.apiextensions.v1.JSONSchemaProps = deepmerge(
  baseResource,
  {
    description: 'BotWebhook defines a namespaced webhook.',
    properties: {
      spec: {
        type: 'object',
        description:
          'BotWebhookSpec is a specification for the desired webhook configuration',
        properties: {
          code: botCode,
          secret: {
            type: 'string',
          },
        },
      },
    },
  }
)

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
              openAPIV3Schema: botCommand,
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
              openAPIV3Schema: botMessageHook,
            },
            served: true,
            storage: true,
          },
        ],
      },
    },
    { provider, dependsOn }
  )

export const botWebhookResource = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apiextensions.v1.CustomResourceDefinition(
    'cerus-bot-webhook-resource',
    {
      metadata: {
        name: 'botwebhooks.cerusbots.com',
        namespace: config.namespace,
      },
      spec: {
        group: 'cerusbots.com',
        names: {
          categories: ['cerusbots'],
          kind: 'BotWebhook',
          listKind: 'BotWebhookList',
          plural: 'botwebhooks',
          shortNames: ['botwebhk', 'botwhk'],
          singular: 'botwebhook',
        },
        scope: 'Namespaced',
        versions: [
          {
            name: 'v1alpha1',
            schema: {
              openAPIV3Schema: botWebhook,
            },
            served: true,
            storage: true,
          },
        ],
      },
    },
    { provider, dependsOn }
  )

export const botTeamMemberResource = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apiextensions.v1.CustomResourceDefinition(
    'cerus-bot-teammember-resource',
    {
      metadata: {
        name: 'botteammembers.cerusbots.com',
        namespace: config.namespace,
      },
      spec: {
        group: 'cerusbots.com',
        names: {
          categories: ['cerusbots'],
          kind: 'BotTeamMember',
          listKind: 'BotTeamMemberList',
          plural: 'botteammembers',
          shortNames: ['botteammbr', 'bottmbr'],
          singular: 'botteammember',
        },
        scope: 'Namespaced',
        versions: [
          {
            name: 'v1alpha1',
            schema: {
              openAPIV3Schema: botTeamMember,
            },
            served: true,
            storage: true,
          },
        ],
      },
    },
    { provider, dependsOn }
  )

export const botResource = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apiextensions.v1.CustomResourceDefinition(
    'cerus-bot-resource',
    {
      metadata: {
        name: 'bots.cerusbots.com',
        namespace: config.namespace,
      },
      spec: {
        group: 'cerusbots.com',
        names: {
          categories: ['cerusbots'],
          kind: 'Bot',
          listKind: 'BotList',
          plural: 'bots',
          shortNames: ['bt'],
          singular: 'bot',
        },
        scope: 'Namespaced',
        versions: [
          {
            name: 'v1alpha1',
            schema: {
              openAPIV3Schema: deepmerge(baseResource, {
                properties: {
                  spec: {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string',
                      },
                      owner: user,
                      intent: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      commands: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            spec: botCommand,
                            ref: { type: 'string' },
                          },
                          maxItems: 1,
                          minItems: 1,
                        },
                      },
                      messageHooks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            spec: botMessageHook,
                            ref: { type: 'string' },
                          },
                          maxItems: 1,
                          minItems: 1,
                        },
                      },
                      webhooks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            spec: botWebhook,
                            ref: { type: 'string' },
                          },
                          maxItems: 1,
                          minItems: 1,
                        },
                      },
                      members: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            spec: botTeamMember,
                            ref: { type: 'string' },
                          },
                          maxItems: 1,
                          minItems: 1,
                        },
                      },
                    },
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

export const botRunnerResource = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apiextensions.v1.CustomResourceDefinition(
    'cerus-bot-runner-resource',
    {
      metadata: {
        name: 'botrunners.cerusbots.com',
        namespace: config.namespace,
      },
      spec: {
        group: 'cerusbots.com',
        names: {
          categories: ['cerusbots'],
          kind: 'BotRunner',
          listKind: 'BotRunnerList',
          plural: 'botrunners',
          shortNames: ['botrnr'],
          singular: 'botrunner',
        },
        scope: 'Namespaced',
        versions: [
          {
            name: 'v1alpha1',
            schema: {
              openAPIV3Schema: deepmerge(baseResource, {
                description:
                  'BotRunner defines a namespaced instance of a bot runner.',
                properties: {
                  spec: {
                    type: 'object',
                    description:
                      'BotRunnerSpec is a specification for the desired bot runner configuration',
                    properties: {
                      bots: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['bots'],
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
    botWebhookResource(config, provider, dependsOn),
    botTeamMemberResource(config, provider, dependsOn),
    botResource(config, provider, dependsOn),
    botRunnerResource(config, provider, dependsOn),
  ]
}
