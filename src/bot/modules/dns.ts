import { LookupOneOptions } from 'dns'
import { isIPv4, isIPv6 } from 'net'
import { isLocalDomain } from '../../utils'

export const lookup = (
  hostname: string,
  options: LookupOneOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string,
    family: number
  ) => void
) => {
  isLocalDomain(hostname)
    .then((domains) => {
      domains = Object.fromEntries(
        Object.entries(domains).filter(([name, isLocal]) => !isLocal)
      )
      const ip = Object.keys(domains)[0]
      callback(null, ip, isIPv4(ip) ? 4 : isIPv6(ip) ? 6 : 0)
    })
    .catch((error) => {
      callback(error, '', -1)
    })
}
