import deepmerge from 'deepmerge'
import * as base from 'https'
import { promisify } from 'util'
import { lookup } from './dns'
import { isLocalIP, deconstructRequestArgs } from '../../utils'
import { isIPv6, isIPv4 } from 'net'

export { Agent, Server, ServerOptions, globalAgent } from 'https'

export function createServer(..._args: Parameters<typeof base.createServer>) {
  throw new Error('Cannot create a server inside of Cerus')
}

export function get(...args: Parameters<typeof base.get>) {
  const options =
    args.length >= 2 ? (typeof args[1] === 'object' ? args[1] : {}) : {}
  return base.get(
    args[0],
    deepmerge<base.RequestOptions>(options, {
      lookup(hostname, lookupOptions, callback) {
        const lookupBuiltin = promisify(lookup)
        const lookupOptionify = promisify(
          typeof options.lookup === 'function' ? options.lookup : lookup
        )

        const run = async () => {
          try {
            const address = await lookupOptionify(hostname, lookupOptions)
            if (isLocalIP(address)) throw new Error('Cannot be a local address')
            return {
              address,
              family: isIPv6(address) ? 6 : isIPv4(address) ? 4 : 0,
            }
          } catch (e) {
            const address = await lookupBuiltin(hostname, lookupOptions)
            return {
              address,
              family: isIPv6(address) ? 6 : isIPv4(address) ? 4 : 0,
            }
          }
        }

        run()
          .then(({ address, family }) => callback(null, address, family))
          .catch((error) => callback(error, '', -1))
      },
    })
  )
}

export function request(...args: Parameters<typeof base.request>) {
  const { url, options, callback } = deconstructRequestArgs(...args)
  return base.request(
    url,
    deepmerge<base.RequestOptions>(options, {
      lookup(hostname, lookupOptions, callback) {
        const lookupBuiltin = promisify(lookup)
        const lookupOptionify = promisify(
          typeof options.lookup === 'function' ? options.lookup : lookup
        )

        const run = async () => {
          try {
            const address = await lookupOptionify(hostname, lookupOptions)
            if (isLocalIP(address)) throw new Error('Cannot be a local address')
            return {
              address,
              family: isIPv6(address) ? 6 : isIPv4(address) ? 4 : 0,
            }
          } catch (e) {
            const address = await lookupBuiltin(hostname, lookupOptions)
            return {
              address,
              family: isIPv6(address) ? 6 : isIPv4(address) ? 4 : 0,
            }
          }
        }

        run()
          .then(({ address, family }) => callback(null, address, family))
          .catch((error) => callback(error, '', -1))
      },
    }),
    callback
  )
}

export default {
  Agent: base.Agent,
  Server: base.Server,
  globalAgent: base.globalAgent,
  createServer,
  get,
  request,
} as typeof base
