import {notFound} from 'next/navigation';
import {isFrameworksMigrationStaging} from '@/lib/video-provider/migration/staging-runtime';
import MigrationOperator from './operator';
export const dynamic='force-dynamic';
export default function Page(){if(!isFrameworksMigrationStaging())notFound();return <MigrationOperator/>;}
