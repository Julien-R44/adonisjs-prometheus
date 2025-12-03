import ipaddr from 'ipaddr.js'

type ParsedWhitelistEntry =
  | { type: 'cidr'; range: ipaddr.IPv4 | ipaddr.IPv6; bits: number }
  | { type: 'ip'; address: ipaddr.IPv4 | ipaddr.IPv6 }

/**
 * IP Whitelist checker
 */
export class IpWhitelist {
  #entries: ParsedWhitelistEntry[] = []
  #allowAll: boolean

  constructor(whitelist: string[]) {
    this.#allowAll = whitelist.length === 0

    for (const entry of whitelist) {
      try {
        if (entry.includes('/')) {
          const [range, bits] = ipaddr.parseCIDR(entry)
          this.#entries.push({ type: 'cidr', range, bits })
        } else {
          this.#entries.push({ type: 'ip', address: ipaddr.parse(entry) })
        }
      } catch {
        // Skip invalid entries
      }
    }
  }

  /**
   * Check if an IP address is allowed.
   */
  isAllowed(ip: string): boolean {
    if (this.#allowAll) return true

    try {
      const parsedIp = ipaddr.parse(ip)

      return this.#entries.some((entry) => {
        if (entry.type === 'cidr') return parsedIp.match(entry.range, entry.bits)
        return entry.address.toNormalizedString() === parsedIp.toNormalizedString()
      })
    } catch {
      return false
    }
  }
}
