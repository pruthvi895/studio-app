import { describe, expect, it } from 'vitest';
import { COULD_NOT_REACH_GITHUB, friendlyError, summarizeErrors } from './errors';
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

describe('friendlyError', () => {
  it('hides Java and JavaScript exception class names', () => {
    expect(friendlyError(new Error('NullPointerException'), COULD_NOT_REACH_GITHUB)).toBe(COULD_NOT_REACH_GITHUB);
    expect(friendlyError(new Error('java.lang.NullPointerException'), COULD_NOT_REACH_GITHUB)).toBe(
      COULD_NOT_REACH_GITHUB
    );
    expect(friendlyError('Exception', COULD_NOT_REACH_GITHUB)).toBe(COULD_NOT_REACH_GITHUB);
    expect(friendlyError(new Error('TypeError: Cannot read properties of null'), COULD_NOT_REACH_GITHUB)).toBe(
      COULD_NOT_REACH_GITHUB
    );
    expect(friendlyError(new Error('JSONException: Value null at data'), COULD_NOT_REACH_GITHUB)).not.toMatch(
      /Exception/
    );
    expect(friendlyError(new Error('This app is private to pruthvi895'), COULD_NOT_REACH_GITHUB)).toBe(
      'This app is private to pruthvi895'
    );
    expect(friendlyError(null, COULD_NOT_REACH_GITHUB)).toBe(COULD_NOT_REACH_GITHUB);
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
