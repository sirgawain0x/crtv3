"use server";

import { getNewsletterIssues } from "@/lib/newsletter";

export async function fetchNewsletterIssues(limit = 6) {
  return getNewsletterIssues(limit);
}
