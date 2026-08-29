import { beforeAll } from 'vitest';

// Set required environment variables before any module loads
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.DEEPSEEK_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
