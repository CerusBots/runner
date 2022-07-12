import { Kafka } from 'kafkajs'
import waitOn from 'wait-on'
import { initKube, KubeDI } from './kube'
import config from './config'

export const DI = {} as {
  kafka: Kafka
  k8s: KubeDI
}

export async function init() {
  if (config.env !== 'testing') {
    await waitOn({
      resources: (config.kafka.brokers as string[]).map((str) => `tcp:${str}`),
      log: config.debug,
    })
  }

  DI.k8s = await initKube()
  DI.kafka = new Kafka({
    ...config.kafka,
    clientId: 'cerus-runner',
  })
}
