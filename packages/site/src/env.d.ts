/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** 디스플레이 광고(AdSense) — 패시브 수익 ③ */
  readonly PUBLIC_ADSENSE_CLIENT?: string;
  readonly PUBLIC_ADSENSE_SLOT?: string;
  /** 데이터 셀프판매 결제 링크(MoR) — 패시브 수익 ① */
  readonly PUBLIC_DATASALE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
