// src/types/types.ts
export interface Proposal {
    id: string;
    title: string;
    body?: string;
    start: number;
    end: number;
    choices: any[];
    creator: string;
    identifier: string;
    snapshot: string;
    scores: number[];
    scores_total: number;
    state: string;
}
  