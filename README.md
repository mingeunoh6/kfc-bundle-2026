# WebXR 8th Wall Template 2026 — SvelteKit × 8th Wall World Tracking

[8th Wall 오픈소스 엔진](https://8thwall.org/)의 **World Tracking(SLAM)** 데모를
최신 **SvelteKit + Svelte 5 (rune 문법)** 으로 마이그레이션한 템플릿입니다.
카메라 피드 위에 큐브 하나가 바닥(y=0) 위에 증강되고, 화면을 탭하면 큐브가
사용자 앞으로 재배치(recenter)됩니다.

공식 예제 [8thwall/threejs-world-effects-example](https://github.com/8thwall/threejs-world-effects-example)을
분석하여 1:1로 포팅했습니다.

## 저장소

- **GitHub**: https://github.com/mingeunoh6/svelte-webxr-oomg-template (기본 브랜치 `main`)
- 이 저장소는 앞으로 만들 WebXR 프로젝트들의 **베이스 템플릿**입니다.
  새 프로젝트는 이 저장소를 clone/template로 시작하거나, Claude Code에서
  `8thWall-svelte-skill` 스킬로 스캐폴딩하세요.
- 설계 문서: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 실행

```bash
npm install
npm run dev
```

- 데스크톱 `http://localhost:5173` → 8th Wall 랜딩 페이지(QR 코드)가 표시됩니다.
- **모바일 테스트**: 같은 네트워크의 폰에서 접속하려면 `--host`를 붙여 실행하세요.
  `--host`가 감지되면 카메라 권한(secure context)을 위해 자동으로 https로 전환됩니다.

```bash
npm run dev -- --host
```

폰에서 터미널에 표시되는 Network 주소(`https://<PC의 LAN IP>:5173`) 접속 → 자체서명 인증서 경고를 승인 →
카메라 권한 허용 → 바닥을 향해 천천히 움직이면 큐브가 바닥에 고정됩니다.
(ngrok 사용 시 `vite.config.ts`의 `allowedHosts`에 이미 `.ngrok-free.dev`가 등록되어 있습니다.)

## 구조 — 공식 예제 → Svelte 5 마이그레이션 맵

| 공식 예제 (vanilla) | 이 템플릿 (Svelte 5) | 역할 |
| --- | --- | --- |
| `index.html`의 `<script>` 태그 3개 | [engine-loader.ts](src/lib/xr/engine-loader.ts) | engine-binary(SLAM)·xrextras·landing-page를 브라우저에서 동적 주입, `xrloaded` 이벤트를 Promise로 래핑 |
| `app.js` (`XR8.addCameraPipelineModules` + `XR8.run`) | [ARScene.svelte](src/lib/components/ARScene.svelte) | 캔버스 attachment(`{@attach}`)로 세션 수명주기 관리 — 마운트 시 시작, 언마운트 시 `XR8.stop()` + 모듈 정리 |
| `threejs-scene-init.js` | [scene-pipeline.ts](src/lib/xr/scene-pipeline.ts) | 커스텀 카메라 파이프라인 모듈: 큐브·그림자 플레인·조명 배치, 탭으로 recenter |
| (없음) | [xr-state.svelte.ts](src/lib/xr/xr-state.svelte.ts) | `$state`/`$derived` rune 기반 전역 AR 상태 (`status`, `error`, `recenterCount`) |
| (없음) | [ArHud.svelte](src/lib/components/ArHud.svelte) | 에러 표시 전용 오버레이 |
| (없음) | [MainUI.svelte](src/lib/components/MainUI.svelte) | MainScene과 함께 렌더링되는 UI 레이어 (하단 recenter 안내 등) |
| (없음) | [Start.svelte](src/lib/components/Start.svelte) | 최초 진입 화면 — 시작하기 버튼을 눌러야 AR 세션(카메라 권한·엔진 로드)이 시작 |
| `XRExtras.Loading.pipelineModule()` (기본 스플래시) | [Splash.svelte](src/lib/components/Splash.svelte) | 커스텀 로딩 화면 — 기본 8th Wall 로더/로고를 대체 (파이프라인에서 Loading 모듈 제거됨) |
| (없음) | [Coach.svelte](src/lib/components/Coach.svelte) | 카메라가 켜지면 나오는 코치마커 팝업 — 확인 시 `recenter()` 후 씬 공개 |
| `threejs-scene-init.js`의 씬 콘텐츠 | [MainScene.svelte](src/lib/components/MainScene.svelte) | 실제 three.js 콘텐츠(큐브·조명·그림자 플레인). 코치마커 동안 invisible 상태로 미리 마운트 + `renderer.compile()`로 사전 컴파일 → 공개 시 버벅임 없음 |

### 앱 플로우

```
Start.svelte (시작하기)
  → Splash.svelte (엔진 로드·카메라 시작 동안 "로딩중..")
  → 카메라 ON (xr.status === 'running')
      ├─ MainScene.svelte 마운트: 콘텐츠를 invisible로 추가 + 사전 컴파일
      └─ Coach.svelte 팝업: "화면을 탭하면 카메라가 새로 정렬됩니다."
  → 코치마커 시작하기 클릭
      → XR8.XrController.recenter() → xr.contentVisible = true → 씬 즉시 공개
```
| `index.css` | [+layout.svelte](src/routes/+layout.svelte) | 전체 화면·스크롤 방지 스타일 |
| — | [+page.ts](src/routes/+page.ts) | `ssr = false` — 엔진은 브라우저 전용 |

### 파이프라인 모듈 (공식 예제와 동일)

```js
XR8.addCameraPipelineModules([
  XR8.GlTextureRenderer.pipelineModule(),     // 카메라 피드 렌더링
  XR8.Threejs.pipelineModule(),               // three.js AR 씬 생성
  XR8.XrController.pipelineModule(),          // SLAM 월드 트래킹
  LandingPage.pipelineModule(),               // 데스크톱 랜딩 페이지 + QR
  XRExtras.FullWindowCanvas.pipelineModule(), // 캔버스 풀스크린
  // XRExtras.Loading은 사용하지 않음 — Splash.svelte로 대체
  XRExtras.RuntimeError.pipelineModule(),     // 런타임 에러 오버레이
  initScenePipelineModule(),                  // 바닥 위 큐브 씬 (커스텀)
])
XR8.run({ canvas })
```

## Svelte 5 rune 사용 포인트

- **`xr-state.svelte.ts`** — 클래스 필드에 `$state`를 선언한 공유 상태 모듈.
  어느 컴포넌트에서든 import해서 읽으면 자동으로 반응형이 됩니다.
- **`ARScene.svelte`** — `bind:this` 대신 Svelte 5.29+의 **attachment**
  (`{@attach arSession}`)로 캔버스 요소에 AR 세션을 묶었습니다.
  cleanup 함수가 세션 종료를 담당하므로 SPA 네비게이션에도 안전합니다.
- **`ArHud.svelte`** — `$derived.by`로 상태 → 라벨 매핑.

## 라이선스 관련

- 8th Wall 프레임워크/모듈(xrextras, landing-page 등)은 **MIT**.
- SLAM 엔진 바이너리(`@8thwall/engine-binary`)는 **별도의 무료 바이너리
  라이선스**(상업적 사용 가능)로 배포됩니다. 앱 키나 계정은 필요 없습니다.
