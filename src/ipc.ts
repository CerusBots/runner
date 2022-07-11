import { ok as assert } from 'assert'
import Emittery from 'emittery'
import { hostname } from 'os'
import { getPodType } from './kube/pod'
import { DI } from './di'
import { RecordMetadata } from 'kafkajs'

export interface IPCMessage {
  type: 'bots:discover'
  target: string
  id: number
  isRequest: boolean
}

export interface IPCMessageBots extends IPCMessage {
  items: string[]
}

export interface IPCMessageError extends IPCMessage {
  error: Error
}

export interface IPCInstance
  extends Emittery<{
    raw: IPCMessage
    'bots:discover': IPCMessageBots['items'] | Error
  }> {
  id: string
  type: 'client' | 'controller'
  send(
    type: IPCMessage['type'],
    isRequest: boolean,
    target?: string,
    ...obj: any[]
  ): Promise<RecordMetadata[]>
  discoverBots(target: string): Promise<IPCMessageBots['items']>
}

export default async function createIPC(): Promise<IPCInstance> {
  const type = await getPodType()
  const self = new Emittery() as IPCInstance
  self.type = type
  self.id = `${hostname()}-${type}`
  let nextID = 0

  const producer = DI.kafka.producer({ allowAutoTopicCreation: true })
  await producer.connect()

  self.send = async (
    type: IPCMessage['type'],
    isRequest: boolean,
    target: string,
    obj?: object
  ) => {
    return await producer.send({
      topic: 'cerus-runner',
      messages: [
        {
          value: JSON.stringify({
            type,
            target,
            id: nextID++,
            isRequest,
            ...(obj || {}),
          }),
          key: self.id,
        },
      ],
    })
  }

  const consumer = DI.kafka.consumer({
    allowAutoTopicCreation: true,
    groupId: 'cerus-runner',
  })
  await consumer.connect()

  await consumer.subscribe({ topic: 'cerus-runner' })
  await consumer.subscribe({ topic: self.id })
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      assert(
        typeof message.value === 'object' && message.value instanceof Buffer
      )
      const body = JSON.parse(message.value.toString('ascii')) as IPCMessage
      const sender = message.key?.toString('ascii')

      if (sender == self.id) return void 0
      if (body.target !== self.id) return void 0

      self.emit('raw', body)
      console.log(body, topic, sender)

      if (body.isRequest) {
        try {
          switch (body.type) {
            case 'bots:discover':
              if (type === 'controller') {
                throw new Error('Unsupported request')
              }

              self.send('bots:discover', false, topic, {
                items: [],
              })
              break
          }
        } catch (e) {
          self.send(body.type, false, topic)
        }
      } else {
        const isError = 'error' in body
        switch (body.type) {
          case 'bots:discover':
            self.emit(
              'bots:discover',
              isError
                ? (body as IPCMessageError).error
                : (body as IPCMessageBots).items
            )
            break
        }
      }
    },
  })

  self.discoverBots = async (target) => {
    await self.send('bots:discover', true, target)
    const resp = await self.once('bots:discover')
    console.log(resp)
    if (Array.isArray(resp)) return resp
    throw resp
  }
  return self
}
