# 13-A 시스템 — 기능개선·결함 검토 리포트

> 범위: 랜딩(영문/국문) · 컬렉터(`server.mjs`) · nginx/서버 배포 · 데이터 자산 · 운영.
> 라이브: https://data.utilverse.info · 서버 `root@115.68.230.40`(Ubuntu 22.04).
> 갱신: 2026-06-06.

## ✅ 이미 수정 완료
| # | 항목 | 조치 |
|---|---|---|
| C1 | 폼이 실패/4xx에도 성공표시(리드 유실·거짓확신) | 2xx일 때만 `#ok`, 실패 시 `#err` + 버튼 비활성화 |
| C2 | 컬렉터 비원자적 쓰기 → 전량 소실 위험 | temp→rename 원자적 쓰기 + 손상 파일 `.corrupt` 백업 |
| C3 | 공개 `/submit` 스팸·카운트 조작 | 허니팟(hp) + IP 레이트리밋(분당 20)/429, nginx XFF |
| C4 | readBody 오버플로 시 핸들러 무한대기 | 오류/오버플로 시 reject |
| I1 | 신호 단일 파일 = 서버 사망 시 유실 | **일일 백업 크론**(`/opt/civicniche/backup.sh`, 14일 보관) |
| I2 | 보안 헤더 없음 | HSTS·X-Content-Type-Options·X-Frame-Options·Referrer-Policy 추가 |
| Q1 | CSV에 RRA용 빈 컬럼 혼입(지저분) | FDA 전용 깔끔한 CSV 생성(`kaggle-fda-contract-manufacturers.csv`, 11열) |

## 🟡 미해결 — 개선점 (영향 큰 순)
| # | 항목 | 왜 중요 | 제안 |
|---|---|---|---|
| **P1** | **소셜 공유 메타·favicon 없음** | 아웃리치(Reddit/LinkedIn/Datarade) 링크 공유 시 미리보기 빈약 → 클릭률 저하. 검증 트래픽 직격. | `og:*`/`twitter:card`/favicon/OG 이미지 추가. **(디자인 작업에 포함 — `DESIGN-BRIEF.md` P1)** |
| **P2** | **방문수 미계측** | 제출만 기록 → "방문 100·제출 0"과 "방문 5·제출 0"은 결론이 완전히 다름. 전환율 모르면 Gate II 해석 왜곡. | nginx access log 기반 일일 방문 집계 스크립트, 또는 경량 분석(Plausible 자체호스팅). 우선은 access log 카운트로 충분. |
| **P3** | **샘플 자동발송 없음** | 샘플 요청 시 "곧 연락"만 → 수동 회신 필요(무인 원칙 일부 위배). 응답 지연 시 리드 식음. | `/submit` intent=sample 시 티저 CSV 자동 첨부 메일(SMTP/메일API). 단 검증단계엔 수동도 허용. |
| **P4** | **신규 리드 알림 없음** | presale 같은 강신호가 와도 `/count` 폴링 전엔 모름 → 핫리드 식음 위험. | presale 발생 시 알림(메일/Slack). Slack MCP 연동돼 있음. |
| P5 | `/count` 공개(수요 수치·pass 노출) | 경쟁자/호기심에 수요 신호 노출. 검증엔 무해하나 굳이 공개 불필요. | 토큰 게이트 또는 집계만 노출 유지(현 상태 허용 가능). |
| P6 | 데이터 품질 잔결함 | US 주소에 "PA US" 중복, 비-US는 `state`=국가코드(MY). 샘플 신뢰도 미세 저하. | normalize 단계에서 주소 파싱·state 분리 보강(추후, 판매 본격화 시). |
| P7 | 커스텀 404·robots 없음 | pre-launch 페이지가 색인되면 미완성 페이지가 노출될 수 있음. | 검증 랜딩에 `noindex` 메타 또는 robots. (SEO 불필요 단계) |
| P8 | 업타임 모니터링 없음 | 컬렉터 다운 시 인지 지연(systemd Restart=always가 1차 방어). | 외부 헬스체크(UptimeRobot 무료) → `/count` 200 감시. |

## 🟢 정상 확인 (결함 아님)
- HTTPS·자동갱신·HTTP→HTTPS 301 정상. 컬렉터·nginx 부팅 자동시작(enabled).
- 폼 필드명 ↔ 컬렉터 계약 일치, 중복제거·강신호 보존·인증보호(`/export` 401) 동작.
- 자동 테스트 26/26 통과(`browser-tests/run.mjs`). 디스크 9GB 여유.

## 권장 처리 순서
1. **디자인 개선 시 P1(메타/favicon) 동시 처리** — `DESIGN-BRIEF.md` 따라.
2. P2(방문 집계) → Gate II 해석 정확도 ↑. 가벼움.
3. P4(presale 알림) → 핫리드 안 놓치게. Slack 연동.
4. P3(샘플 자동발송) → 무인화. 검증 통과 후여도 무방.
5. 나머지(P5~P8)는 검증 GO 이후 본빌드 단계에서.
