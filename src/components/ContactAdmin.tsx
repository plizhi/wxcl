'use client';

import { useState } from 'react';

// 领取激活码的联系入口。
//
// 为什么是「扫码 + 邮箱」两个通道：
// - 扫码（企微）是同步的，用户当场能拿到码，适合主路径；
// - 邮箱是异步的，但 support@nzyy.cc 本来就是望杏成林对外公示的联系方式
//   （/terms 与 /privacy 两页都在用），家长已经知道，不突兀，适合当兜底。
//
// 联系方式走环境变量，换人不用改代码重新 build。
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL || 'support@nzyy.cc';
const WECOM_IMAGE = process.env.NEXT_PUBLIC_ADMIN_WECOM_IMAGE || '/images/wecom.png';

export default function ContactAdmin({
  title = '还没有激活码？',
  hint = '扫码添加客服，领取您的专属激活码',
}: {
  title?: string;
  hint?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-xl bg-amber-50/70 p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-amber-800">{title}</p>
          <p className="mt-0.5 text-xs text-amber-600">{hint}</p>
        </div>
        <span className="text-xs text-amber-500">{expanded ? '收起' : '展开'}</span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WECOM_IMAGE}
            alt="客服二维码"
            className="h-36 w-36 rounded-lg border border-amber-100 bg-white object-contain"
          />
          <p className="text-xs text-amber-600">长按识别，添加客服微信</p>
          <p className="text-xs text-amber-600">
            或发邮件至{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-amber-700 underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
