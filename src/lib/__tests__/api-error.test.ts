import { describe, it, expect } from 'vitest';
import { ApiError, errors, handlePrismaError } from '../api-error';

describe('ApiError', () => {
  it('creates error with correct status and code', () => {
    const err = new ApiError(401, 401, '未登录');
    expect(err.status).toBe(401);
    expect(err.code).toBe(401);
    expect(err.message).toBe('未登录');
    expect(err.name).toBe('ApiError');
  });

  it('toResponse returns correct shape', () => {
    const err = new ApiError(403, 403, '无权访问');
    expect(err.toResponse()).toEqual({ code: 403, message: '无权访问' });
  });
});

describe('errors factory', () => {
  it('unauthorized returns 401', () => {
    const err = errors.unauthorized();
    expect(err.status).toBe(401);
    expect(err.code).toBe(401);
    expect(err.message).toBe('未登录');
  });

  it('forbidden returns 403', () => {
    const err = errors.forbidden();
    expect(err.status).toBe(403);
    expect(err.code).toBe(403);
  });

  it('badRequest returns 400', () => {
    const err = errors.badRequest('参数错误');
    expect(err.status).toBe(400);
    expect(err.message).toBe('参数错误');
  });

  it('notFound returns 404', () => {
    const err = errors.notFound('用户不存在');
    expect(err.status).toBe(404);
    expect(err.message).toBe('用户不存在');
  });

  it('serverError returns 500', () => {
    const err = errors.serverError();
    expect(err.status).toBe(500);
    expect(err.code).toBe(500);
  });

  it('conflict returns 409', () => {
    const err = errors.conflict('资源冲突');
    expect(err.status).toBe(409);
    expect(err.code).toBe(409);
  });
});

describe('handlePrismaError', () => {
  it('P2002 → 409 唯一约束冲突', () => {
    const err = handlePrismaError({ code: 'P2002' });
    expect(err.status).toBe(409);
    expect(err.code).toBe(409);
    expect(err.message).toBe('唯一约束冲突，数据已存在');
  });

  it('P2025 → 404 记录不存在', () => {
    const err = handlePrismaError({ code: 'P2025' });
    expect(err.status).toBe(404);
    expect(err.code).toBe(404);
    expect(err.message).toBe('记录不存在');
  });

  it('其他 P* 错误 → 500', () => {
    const err = handlePrismaError({ code: 'P1001' });
    expect(err.status).toBe(500);
    expect(err.message).toBe('数据库操作失败');
  });

  it('未知错误 → 500', () => {
    const err = handlePrismaError(new Error('unknown'));
    expect(err.status).toBe(500);
    expect(err.message).toBe('服务器错误');
  });

  it('ApiError 直接返回（不转换）', () => {
    const original = new ApiError(400, 400, '自定义错误');
    const result = handlePrismaError(original);
    expect(result).toBe(original);
  });
});
