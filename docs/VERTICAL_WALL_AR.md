# Vertical Wall AR 세팅 (World Tracking 기반 가짜 오브젝트 인식)

원본(Mattercraft + Immersal VPS)에서는 매장 벽면의 실제 조형물을 비추면 그 위에서
캐슬이 튀어나왔다. 8th Wall 월드 트래킹에는 VPS가 없으므로, **사용자가 직접
"벽이 생길 지점"과 "조형물이 있는 지점"을 지정**하게 해서 같은 경험을 재현한다.

## 단계

| 단계 | `kfc.stage` | 화면 | 사용자 행동 | 탭 시 |
|---|---|---|---|---|
| 0 | – | Coach 마커 | 시작하기 | `recenter()` → stage `wall` |
| 1 | `wall` | 바닥 위 **흰색 라인** (카메라 진행 방향과 수직, 카메라 중심 레이 ↔ 바닥 y=0 교차점에 실시간 추종) | 폰을 움직여 라인을 실제 벽 하단에 맞춤 | 라인 pose 그대로 **가상 벽 생성** → stage `castle` |
| 2 | `castle` | 가상 벽 = 아래 흰색 → 위로 투명해지는 그라데이션 평면. 카메라 중심 레이 ↔ 벽 교차점에 **빨간 원형 링** | 링을 실제 조형물 위치에 맞춤 | 그 지점에 캐슬 앵커 확정, 벽 비가시화(그림자만) → stage `play`, 입장 연출 시작 |
| 3 | `play` | 원래 KFC 연출 (입장 → 박스 벽 → 캐슬 터치 시 버스트) | 캐슬/박스 터치 | 버스트 |
| – | 아무 때나 | 우상단 **다시 배치** | | `recenter()` + stage `wall`로 리셋 |

레이가 바닥/벽에 닿지 않으면(폰을 위로 들면) 마커를 숨기고 안내 문구를 바꾼다.

## 좌표계

- recenter 직후 카메라는 `(0, CAMERA_HEIGHT, 0)`에서 -Z를 바라본다. 바닥은 y = 0.
- **라인/벽 그룹**: `position = 바닥 교차점`, `lookAt(교차점 - 카메라 수평 forward)` → 그룹의 **+Z가 카메라 쪽**을 향한다.
  따라서 벽 앞면 법선 = +Z, 이펙트 로컬 +Z(버스트/캐슬 등장 방향)도 자연히 카메라 쪽.
- **캐슬 앵커** = 벽 그룹 로컬 `(hit.x, hit.y, 0)`. `hit.y`가 곧 바닥에서 앵커까지의 높이다.

## 앵커 위치에 따라 동적으로 세팅되는 값 (요구사항 3)

| 값 | 세팅 | 이유 |
|---|---|---|
| `KfcEffect.root.position` | `(hit.x, hit.y, 0)` (벽 로컬) | 캐슬이 지정 지점에서 튀어나옴 |
| `KfcEffect.root.rotation` | 벽 그룹을 부모로 → 벽 yaw 상속 | 박스 벽이 실제 벽면을 따라 쌓임 |
| `cfg.burstFloorY` | `-hit.y / EFFECT_SCALE` | 버스트 박스/치킨·파티클이 **실제 바닥(y=0)** 에 떨어지도록. Scene.zcomp의 -7.5는 매장 설치 높이(2.36 m) 전용이었으므로 앵커 높이에서 다시 유도 |
| `cfg.shadowFloorSize` | 기존 10 유지 | 이펙트 자체 바닥 그림자 평면이 burstFloorY에 놓임 |
| Key light | 벽 그룹의 자식, `anchor + KEY_LIGHT.offset`, target = anchor | 그림자가 벽/바닥에 일관되게 |
| 벽 그림자 평면 | 벽 그룹에 상시 존재(ShadowMaterial 0.1), 그라데이션 평면만 숨김 | 벽면 그림자 유지 |
| 그 외 이펙트 값 | Scene.zcomp 튜닝값 그대로 | 물리/타이밍은 위치와 무관 |

## 코드

- `src/lib/kfc/wall-placer.ts` — `WallPlacer`: 바닥 라인, 그라데이션 벽, 빨간 링, 레이캐스트, `confirmWall()` / `confirmCastle()` / `reset()`.
- `src/lib/components/MainScene.svelte` — 프레임마다 `placer.update(camera)`, 탭 분기(stage별), 확정 시 이펙트 재배치 + `setConfig({ burstFloorY })` + `startEntrance()`.
- `src/lib/kfc/kfc-state.svelte.ts` — `stage`, `aimValid` (레이 명중 여부) 추가.
- `src/lib/components/MainUI.svelte` — 단계별 안내 문구.
