export type ImportFailureCode='policy-unconfirmed'|'provider-auth'|'provider-validation'|'provider-timeout'|'provider-unavailable';
/** Fixed classifications only. Raw provider messages and URLs must never reach an operator response. */
export class MigrationProviderFailure extends Error {
 constructor(readonly failureCode:ImportFailureCode){super('Protected upload preparation failed');}
}
export class ImportStoppedError extends Error {
 constructor(readonly failureCode:ImportFailureCode){super(`Import stopped during protected upload preparation (${failureCode}). Inspect its reservation before retrying.`);}
}
