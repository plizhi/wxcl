import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateCode,
  generateToken,
  verifyToken,
  getTokenFromHeader,
} from '../auth';

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies password correctly', () => {
    const password = 'testPassword123';
    const hash = hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it('returns false for wrong password', () => {
    const hash = hashPassword('correctPassword');
    expect(verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('different hashes for same password (salt)', () => {
    const hash1 = hashPassword('samePassword');
    const hash2 = hashPassword('samePassword');
    expect(hash1).not.toBe(hash2);
  });
});

describe('generateCode', () => {
  it('generates 8 character code', () => {
    const code = generateCode();
    expect(code.length).toBe(8);
  });

  it('contains only valid characters', () => {
    const code = generateCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateCode()));
    expect(codes.size).toBe(100);
  });
});

describe('generateToken / verifyToken', () => {
  it('generates and verifies token', () => {
    const payload = { userId: 'test-user-id', phone: '13800138000' };
    const token = generateToken(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT format

    const verified = verifyToken(token);
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.phone).toBe(payload.phone);
  });

  it('returns null for invalid token', () => {
    expect(verifyToken('invalid.token.here')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('not.a.jwt')).toBeNull();
  });
});

describe('getTokenFromHeader', () => {
  it('extracts token from Bearer header', () => {
    expect(getTokenFromHeader('Bearer abc123')).toBe('abc123');
    expect(getTokenFromHeader('Bearer eyJhbGciOiJIUzI1NiJ9.test')).toBe('eyJhbGciOiJIUzI1NiJ9.test');
  });

  it('returns null for missing header', () => {
    expect(getTokenFromHeader(null)).toBeNull();
    expect(getTokenFromHeader('')).toBeNull();
  });

  it('returns null for non-Bearer header', () => {
    expect(getTokenFromHeader('Basic abc123')).toBeNull();
    expect(getTokenFromHeader('bearer token')).toBeNull(); // lowercase
  });
});
