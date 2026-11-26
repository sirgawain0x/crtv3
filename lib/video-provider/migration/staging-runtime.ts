import {resolveVideoProviderId} from '../config';
/** Never expose the operator action in production or against an implicit production database. */
export function isFrameworksMigrationStaging():boolean {
 return process.env.VERCEL_ENV==='preview' && process.env.NEXT_PUBLIC_SUPABASE_URL==='https://zxpobpucayevlrzdxhmr.supabase.co' && resolveVideoProviderId()==='frameworks';
}
