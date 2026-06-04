// 오프라인 데모용 샘플 소스 2종(공식 등록부 + OSM). 의도적으로 중복·불일치를 넣어
// 중복제거·교차검증 파이프라인을 실제로 작동시킨다. 실제 니치 데이터로 교체하세요.

/** 소스 A: 공식 등록부 형태(공공데이터포털 스타일 필드명) */
export function fetchSampleOfficial() {
  const license = { name: 'data.go.kr:동물장묘업', url: 'https://www.data.go.kr', license: 'KOGL-variant' };
  const rows = [
    { biz_nm: '무지개나라 펫추모공원', road_addr: '경기도 광주시 곤지암읍 1-1', oper_hr: '09:00~20:00', reg_no: '2020-3', lat: 37.34, lng: 127.29, svc: '화장,봉안' },
    { biz_nm: '포에버펫 메모리얼', road_addr: '인천광역시 서구 2-2', oper_hr: '10시-19시', reg_no: '2019-7', lat: 37.50, lng: 126.65, svc: '화장' },
    { biz_nm: '스카이펫 추모', road_addr: '강원특별자치도 원주시 3-3', oper_hr: '24시간', reg_no: '2021-1', lat: 37.34, lng: 127.95, svc: '화장,봉안,픽업' },
    { biz_nm: '그린펫 메모리얼', road_addr: '충청북도 청주시 4-4', oper_hr: '09:00~18:00', reg_no: '2022-5', lat: 36.64, lng: 127.49, svc: '화장' },
    { biz_nm: '한강 펫 가든', road_addr: '서울특별시 강서구 5-5', oper_hr: '', reg_no: '2023-2', lat: 37.55, lng: 126.84, svc: '봉안' },
  ];
  return rows.map((r) => ({ _source: license, ...r }));
}

/** 소스 B: OSM 형태(필드명 다름, 일부 엔티티 겹침, 한 곳은 영업시간 불일치) */
export function fetchSampleOSM() {
  const license = { name: 'osm', url: 'https://www.openstreetmap.org', license: 'ODbL' };
  const rows = [
    { name: '무지개나라 펫추모공원', addr: '경기 광주시 곤지암읍 1-1', opening_hours: 'Mo-Su 09:00-20:00', lat: 37.34, lon: 127.29 },
    // 불일치: 포에버펫 영업시간이 공식과 다름(10-19 vs 10-18) → 교차검증에서 stale-flag 기대
    { name: '포에버펫 메모리얼', addr: '인천 서구 2-2', opening_hours: 'Mo-Sa 10:00-18:00', lat: 37.50, lon: 126.65 },
    // OSM에만 있는 신규(교차검증 단일출처 → 보수적 처리 기대)
    { name: '들꽃 반려동물 추모', addr: '전라남도 순천시 6-6', opening_hours: 'Mo-Su 10:00-18:00', lat: 34.95, lon: 127.49 },
  ];
  return rows.map((r) => ({ _source: license, ...r }));
}
