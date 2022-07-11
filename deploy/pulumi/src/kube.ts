import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from './config'

import crds from './components/crds'
import namespace from './components/namespace'
import runner from './components/runner'

export function createKube(config: Configuration, provider?: k8s.Provider) {
  const dependsOn: pulumi.Resource[] = []
  if (!config.hasNamespace) dependsOn.push(namespace(config, provider))
  const crdsRes = crds(config, provider, dependsOn)
  const runnerRes = runner(config, provider, [...dependsOn, ...crdsRes])
  return [...dependsOn, ...crdsRes, ...runnerRes]
}
