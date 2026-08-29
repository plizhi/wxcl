export class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  toResponse() {
    return { code: this.code, message: this.message };
  }
}

export const errors = {
  unauthorized: () => new ApiError(401, 401, "未登录"),
  forbidden: () => new ApiError(403, 403, "无权访问"),
  notFound: (msg = "资源不存在") => new ApiError(404, 404, msg),
  badRequest: (msg = "请求参数错误") => new ApiError(400, 400, msg),
  serverError: (msg = "服务器错误") => new ApiError(500, 500, msg),
  conflict: (msg = "资源冲突") => new ApiError(409, 409, msg),
};

export function handlePrismaError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    throw err;
  }

  const e = err as { code?: string | number };

  if (e.code === "P2002") {
    return new ApiError(409, 409, "唯一约束冲突，数据已存在");
  }
  if (e.code === "P2025") {
    return new ApiError(404, 404, "记录不存在");
  }
  if (typeof e.code === "string" && e.code.startsWith("P")) {
    return new ApiError(500, 500, "数据库操作失败");
  }
  return new ApiError(500, 500, "服务器错误");
}

export function withErrorHandler<T extends (...args: any[]) => Promise<ReturnType<T>>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw handlePrismaError(err);
    }
  };
}
