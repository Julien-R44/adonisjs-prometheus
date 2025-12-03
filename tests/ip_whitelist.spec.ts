import { test } from '@japa/runner'

import { IpWhitelist } from '../src/ip_whitelist.js'

test.group('IP Whitelist', () => {
  test('allow any IP when whitelist is empty', async ({ assert }) => {
    const whitelist = new IpWhitelist([])
    assert.isTrue(whitelist.isAllowed('192.168.1.1'))
  })

  test('allow exact IP match', async ({ assert }) => {
    const whitelist = new IpWhitelist(['192.168.1.100'])
    assert.isTrue(whitelist.isAllowed('192.168.1.100'))
    assert.isFalse(whitelist.isAllowed('192.168.1.101'))
  })

  test('allow CIDR range', async ({ assert }) => {
    const whitelist = new IpWhitelist(['192.168.1.0/24'])
    assert.isTrue(whitelist.isAllowed('192.168.1.50'))
    assert.isFalse(whitelist.isAllowed('192.168.2.1'))
  })

  test('allow mix of exact IPs and CIDR ranges', async ({ assert }) => {
    const whitelist = new IpWhitelist(['10.0.0.5', '192.168.1.0/24'])

    assert.isTrue(whitelist.isAllowed('10.0.0.5'))
    assert.isTrue(whitelist.isAllowed('192.168.1.50'))
    assert.isFalse(whitelist.isAllowed('10.0.0.6'))
  })

  test('return false for invalid IP addresses', async ({ assert }) => {
    const whitelist = new IpWhitelist(['192.168.1.0/24'])
    assert.isFalse(whitelist.isAllowed('not-an-ip'))
    assert.isFalse(whitelist.isAllowed(''))
  })

  test('skip invalid whitelist entries', async ({ assert }) => {
    const whitelist = new IpWhitelist(['invalid', '192.168.1.0/24'])
    assert.isTrue(whitelist.isAllowed('192.168.1.50'))
  })
})
