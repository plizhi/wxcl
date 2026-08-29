import { describe, it, expect } from 'vitest';
import { prisma } from '../prisma';

describe('prisma singleton', () => {
  it('prisma instance is exported', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma).toBe('object');
  });

  it('has expected model properties', () => {
    const expectedModels = [
      'user',
      'authSession',
      'child',
      'record',
      'question',
      'nourishmentMoment',
      'nourishmentReport',
      'childProfile',
      'profileEvent',
      'profileVersion',
      'profileOpportunity',
      'parentReflection',
    ];

    for (const model of expectedModels) {
      expect((prisma as unknown as Record<string, unknown>)[model]).toBeDefined();
    }
  });
});
