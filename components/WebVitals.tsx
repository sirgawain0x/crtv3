'use client';

import { AxiomWebVitals } from 'next-axiom';

/**
 * WebVitals component for reporting Core Web Vitals to Axiom.
 * Uses next-axiom's AxiomWebVitals component which integrates with Next.js's
 * built-in useReportWebVitals hook, preventing duplicate reporting.
 */
export function WebVitals() {
  return <AxiomWebVitals />;
}
