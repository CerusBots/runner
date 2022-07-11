import { hostname } from 'os'
import { Kafka } from 'kafkajs'
import waitOn from 'wait-on'
import { getPodType } from './kube/pod'
import { initKube, KubeDI } from './kube'
import config from './config'
import createIPC, { IPCInstance } from './ipc'

export const DI = {} as {
  kafka: Kafka
  k8s: KubeDI
  ipc: IPCInstance
}

export async function init() {
  if (config.env !== 'testing') {
    await waitOn({
      resources: (config.kafka.brokers as string[]).map((str) => `tcp:${str}`),
      log: config.debug,
    })
  }

  DI.k8s = await initKube()
  const podType = await getPodType()
  DI.kafka = new Kafka({
    ...config.kafka,
    clientId: 'cerus-runner',
  })
  DI.ipc = await createIPC()
}
