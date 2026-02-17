import { describe, it, expect } from 'vitest';
import { nextRevisionLetter } from '../test-helpers';

describe('Revision Letter', () => {
  it('should return A for first revision (empty input)', () => {
    expect(nextRevisionLetter('')).toBe('A');
  });

  it('should increment A → B', () => {
    expect(nextRevisionLetter('A')).toBe('B');
  });

  it('should increment B → C', () => {
    expect(nextRevisionLetter('B')).toBe('C');
  });

  it('should increment Y → Z', () => {
    expect(nextRevisionLetter('Y')).toBe('Z');
  });

  it('should increment Z → AA', () => {
    expect(nextRevisionLetter('Z')).toBe('AA');
  });

  it('should increment AA → AB', () => {
    expect(nextRevisionLetter('AA')).toBe('AB');
  });

  it('should increment AZ → BA', () => {
    expect(nextRevisionLetter('AZ')).toBe('BA');
  });

  it('should increment ZZ → AAA', () => {
    expect(nextRevisionLetter('ZZ')).toBe('AAA');
  });

  it('should increment BA → BB', () => {
    expect(nextRevisionLetter('BA')).toBe('BB');
  });

  it('should handle multi-letter sequences correctly', () => {
    expect(nextRevisionLetter('AAA')).toBe('AAB');
    expect(nextRevisionLetter('AAZ')).toBe('ABA');
    expect(nextRevisionLetter('AZZ')).toBe('BAA');
    expect(nextRevisionLetter('ZZZ')).toBe('AAAA');
  });
});
