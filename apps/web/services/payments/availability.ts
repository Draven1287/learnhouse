/** Display capability only; API authorization remains authoritative. Unknown is not an empty purchase history. */
export function paymentsUnavailable(mode: string | null, config: any): boolean {
  return mode === 'oss' || config?.resolved_features?.payments?.enabled === false ||
    (config?.resolved_features?.payments?.enabled == null && config?.features?.payments?.enabled === false)
}
