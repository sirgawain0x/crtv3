// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const zero = '0x' + '0'.repeat(64);
const state = vi.hoisted(() => ({ text: 'Will it ship?\u241fgeneral\u241fen_US', finalized: 2n, answer: ('0x' + '0'.repeat(64)) as string | null }));
vi.mock('@/lib/sdk/reality-eth/reality-eth-question-wrapper', () => ({
  getQuestion: async () => ({ question: state.text, template_id: 0n,
    opening_ts: 1n, timeout: 1n, finalize_ts: state.finalized, is_pending_arbitration: false,
    bounty: 0n, bond: 0n, min_bond: 0n, best_answer: '0x' + '0'.repeat(64), history_hash: '0x' + '0'.repeat(64) }),
  getFinalAnswer: async () => state.answer,
}));
vi.mock('graphql-request', () => ({ gql: (parts: TemplateStringsArray) => parts.join(''), request: async () => ({ question: { answers: [] } }) }));
vi.mock('./BetForm', () => ({ BetForm: () => null }));
vi.mock('./ClaimWinningsCard', () => ({ ClaimWinningsCard: () => null }));
vi.mock('./EvidenceSubmissionModal', () => ({ EvidenceSubmissionModal: () => null }));
vi.mock('@/components/Videos/ShareDialog', () => ({ ShareDialog: () => null }));
import { PredictionDetails } from './PredictionDetails';
beforeEach(() => { state.text = 'Will it ship?\u241fgeneral\u241fen_US'; state.finalized = 2n; state.answer = zero; });
afterEach(() => vi.unstubAllGlobals());
async function withDetails(assertions: (container: HTMLDivElement) => void) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ metadata: null })));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<PredictionDetails questionId={zero} />); });
    assertions(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
it('renders a finalized zero-valued boolean answer as resolved No', async () => {
  await withDetails(container => {
    expect(container.textContent).toContain('Will it ship?');
    expect(container.textContent).toContain('Resolved');
    expect(container.textContent).toContain('Final Answer');
    expect(container.textContent).toContain('No');
    expect(container.textContent).not.toContain('Waiting for resolution');
  });
});
it('does not present the unanswered zero default as a submitted leading answer', async () => {
  state.finalized = 0n; state.answer = null;
  await withDetails(container => {
    expect(container.textContent).not.toContain('· leading');
    expect(container.textContent).not.toContain('Final Answer');
  });
});
it('does not offer an invented default prediction when verified text is unavailable', async () => {
  state.text = '';
  await withDetails(container => {
    expect(container.textContent).toContain('Prediction text is temporarily unavailable');
    expect(container.textContent).not.toContain('Outcomes');
  });
});
