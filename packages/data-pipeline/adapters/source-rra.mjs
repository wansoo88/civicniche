// RRA(국립전파연구원) KC/전파 적합성평가 어댑터(§4.6).
// DATA_GO_KR_KEY 있으면 data.go.kr OpenAPI로 실제 조회, 없으면 샘플 폴백(오프라인 데모).
// ⚠️ 착수 전 게이트: 해당 데이터셋이 'LINK형'이 아니라 전건 벌크 적재·재배포 허용인지 1건 확인(추천 근거의 유일 전제).
import { fetchPublicData } from './source-publicdata.mjs';

// data.go.kr 적합성평가 현황 엔드포인트는 데이터셋에 따라 다름 — 실제 URL/파라미터로 교체.
const RRA_ENDPOINT = process.env.RRA_ENDPOINT || ''; // 예: https://apis.data.go.kr/.../getCertList

/** 샘플 폴백: KC 적합성평가 레코드 형태(모델명 단위). 실제 데이터로 교체. */
function sampleRRA() {
  const license = { name: 'data.go.kr:적합성평가', url: 'https://www.data.go.kr', license: 'KOGL-variant' };
  const rows = [
    { equip_nm: 'BLE 무선모듈 XYZ-100', cert_no: 'R-C-XYZ-100', company: '주식회사 가나전자', maker: 'Shenzhen ABC', country: '중국', cert_date: '2024-03-11', kind: '적합성평가(잠정인증)' },
    { equip_nm: '산업용 Wi-Fi AP MZ-7', cert_no: 'R-R-MZ7-7', company: '마루테크', maker: '마루테크', country: '대한민국', cert_date: '2023-11-02', kind: '적합인증' },
    { equip_nm: 'IoT 게이트웨이 G2', cert_no: 'R-C-G2-22', company: '델타시스템', maker: 'Delta Vietnam', country: '베트남', cert_date: '2024-01-20', kind: '적합등록' },
    { equip_nm: '의료용 텔레메트리 송신기 T-300', cert_no: 'R-C-T300', company: '한빛메디칼', maker: 'Hanbit', country: '대한민국', cert_date: '2024-05-09', kind: '적합성평가' },
  ];
  return rows.map((r) => ({
    _source: license,
    name: `${r.equip_nm} (${r.cert_no})`,
    region: r.country, // 인증은 지역보다 제조국/종류가 축 — region에 제조국 사용
    road_addr: null,
    reg_no: r.cert_no,
    svc: r.kind,
    attributes: {
      equipment_name: r.equip_nm,
      cert_no: r.cert_no,
      company: r.company,
      maker: r.maker,
      country: r.country,
      cert_date: r.cert_date,
      cert_kind: r.kind,
    },
  }));
}

export async function fetchRRA(opts = {}) {
  if (process.env.DATA_GO_KR_KEY && RRA_ENDPOINT) {
    const rows = await fetchPublicData({
      endpoint: RRA_ENDPOINT,
      datasetName: '적합성평가',
      params: opts.params || { numOfRows: '100', pageNo: '1' },
      map: (it) => ({
        name: `${it.equpmntNm || it.equip_nm} (${it.certNum || it.cert_no})`,
        region: it.mnfctrNtnNm || it.country || null,
        reg_no: it.certNum || it.cert_no || null,
        svc: it.certKindNm || it.kind || null,
        attributes: {
          equipment_name: it.equpmntNm, cert_no: it.certNum, maker: it.mnfctr,
          country: it.mnfctrNtnNm, cert_date: it.certDt, cert_kind: it.certKindNm,
        },
      }),
    });
    if (rows.length) return rows;
    console.warn('⚠️  RRA 실데이터 0건 → 샘플 폴백');
  }
  return sampleRRA();
}
