import { describe, expect, it } from 'vitest';
import { summarizeErrors } from './errors';
import { pullOffset } from './pull';

describe('pullOffset', () => {
  it('arms only after a deliberate pull', () => {
    expect(pullOffset(0)).toEqual({ offset: 0, armed: false });
    expect(pullOffset(-20)).toEqual({ offset: 0, armed: false });
    expect(pullOffset(40).armed).toBe(false);
    expect(pullOffset(160)).toEqual({ offset: 72, armed: true });
    expect(pullOffset(400).offset).toBe(88);
  });
});

describe('summarizeErrors', () => {
  it('dedupes refresh errors', () => {
    expect(summarizeErrors([])).toBeNull();
    expect(summarizeErrors([' Authentication failed ', 'Authentication failed'])).toBe('Authentication failed');
    expect(summarizeErrors(['Could not read state/qa.json', 'Failed to fetch state/ig.json'])).toBe(
      'Could not read state/qa.json (+1 more)'
    );
  });
});
