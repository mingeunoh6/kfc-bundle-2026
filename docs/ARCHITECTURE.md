# 아키텍처 문서 — WebXR 8th Wall × SvelteKit Template

> 2026-08 기준. 8th Wall 오픈소스 엔진을 SvelteKit + Svelte 5(rune)로 마이그레이션한
> World Tracking 템플릿의 전체 구조와 설계 결정을 정리한 문서.

## 0. 저장소 정보

| 항목 | 값 |
| --- | --- |
| GitHub | https://github.com/mingeunoh6/svelte-webxr-oomg-template |
| 기본 브랜치 | `main` |
| 용도 | 이후 모든 WebXR 프로젝트의 베이스 템플릿 |
| 로컬 경로 | `F:\WebXR_8thWall_Template-2026` |
| Claude Code 스킬 | `8thWall-svelte-skill` (`~/.claude/skills/8thWall-svelte-skill`) — 이 템플릿을 새 폴더에 스캐폴딩 |

새 프로젝트를 시작할 때는 이 저장소를 clone하거나 GitHub의 "Use this template"으로
복제한 뒤 `MainScene.svelte`(3D 콘텐츠)와 `MainUI.svelte`(UI)부터 수정하면 된다.

## 1. 배경 — 8th Wall 오픈소스

- Niantic의 WebAR 플랫폼 8th Wall은 호스팅 서비스 종료와 함께
  [github.com/8thwall/8thwall](https://github.com/8thwall/8thwall)로 오픈소스화됐다 (커뮤니티 허브: [8thwall.org](https://8thwall.org/)).
- **라이선스**: 프레임워크/모듈(xrextras, landing-page 등)은 MIT.
  SLAM 엔진 바이너리(`@8thwall/engine-binary`)는 별도의 무료 바이너리 라이선스
  (상업적 사용 가능, 앱 키·계정 불필요).
- **엔진 로딩** (jsDelivr CDN):

  | 스크립트 | 역할 |
  | --- | --- |
  | `@8thwall/engine-binary@1/dist/xr.js` (+`data-preload-chunks="slam"`) | XR 엔진 + SLAM. 로드 완료 시 `window.XR8` 생성, `xrloaded` 이벤트 발행 |
  | `@8thwall/xrextras@1/dist/xrextras.js` | `window.XRExtras` — 풀윈도우 캔버스, 로딩, 에러 오버레이 유틸 |
  | `@8thwall/landing-page@1/dist/landing-page.js` | `window.LandingPage` — 데스크톱 접속 시 QR 랜딩 페이지 |

- **원본 참고 예제**: [8thwall/threejs-world-effects-example](https://github.com/8thwall/threejs-world-effects-example)
  (index.html + app.js + threejs-scene-init.js 구조의 vanilla JS + Vite 프로젝트)

## 2. 카메라 파이프라인 모듈 시스템

8th Wall 엔진의 핵심 개념. `XR8.run({canvas})` 전에 모듈들을 등록하면
엔진이 각 모듈의 생명주기 훅(`onStart`, `onUpdate` 등)을 호출한다.

```js
XR8.addCameraPipelineModules([
  XR8.GlTextureRenderer.pipelineModule(),     // 카메라 피드를 캔버스에 그림
  XR8.Threejs.pipelineModule(),               // three.js scene/camera/renderer 생성·소유
  XR8.XrController.pipelineModule(),          // SLAM 6DoF 트래킹
  LandingPage.pipelineModule(),               // 데스크톱 감지 → QR 랜딩 (z-index 815)
  XRExtras.FullWindowCanvas.pipelineModule(), // 캔버스를 항상 풀윈도우로
  // XRExtras.Loading 은 의도적으로 미사용 → Splash.svelte로 대체
  XRExtras.RuntimeError.pipelineModule(),     // 런타임 에러 오버레이
  initScenePipelineModule(),                  // 커스텀: 렌더러/카메라/제스처 설정
])
XR8.run({ canvas })
```

`XR8.Threejs.xrScene()`으로 엔진 소유의 `{ scene, camera, renderer }`에 접근한다.
콘텐츠는 이 scene에 추가하면 되고, 카메라 pose는 SLAM이 매 프레임 갱신한다.

## 3. 파일 구조와 역할

```
src/
├── lib/
│   ├── assets/cube-texture.png     데모 큐브 텍스처 (공식 예제 원본)
│   ├── xr/
│   │   ├── types.ts                XR8/XRExtras/LandingPage 전역 타입 선언
│   │   ├── engine-loader.ts        CDN 스크립트 동적 주입 + xrloaded → Promise<XR8>
│   │   ├── xr-state.svelte.ts      Svelte 5 rune 전역 상태 (아래 4장)
│   │   └── scene-pipeline.ts       커스텀 파이프라인 모듈 (렌더러·카메라·탭 recenter)
│   └── components/
│       ├── ARScene.svelte          캔버스 + 세션 생명주기 ({@attach} attachment)
│       ├── Start.svelte            진입 화면 — 시작하기 버튼 (유저 제스처 후 세션 시작)
│       ├── Splash.svelte           커스텀 로딩 화면 (기본 8th Wall 로더 대체)
│       ├── Coach.svelte            코치마커 팝업 — 확인 시 recenter() + 씬 공개
│       ├── MainScene.svelte        실제 three.js 콘텐츠 (renderless, 사전 컴파일)
│       ├── MainUI.svelte           씬과 함께 뜨는 UI 레이어 (하단 안내 등)
│       └── ArHud.svelte            에러 표시 오버레이
└── routes/
    ├── +layout.svelte              풀스크린/스크롤 방지 전역 스타일
    ├── +page.ts                    ssr = false (엔진은 브라우저 전용)
    └── +page.svelte                화면 상태 머신 (아래 5장)
```

## 4. 상태 관리 — `xr-state.svelte.ts`

클래스 필드에 `$state`/`$derived`를 선언한 rune 모듈. import한 모든 컴포넌트에서
자동 반응형으로 동작한다.

| 필드 | 의미 |
| --- | --- |
| `status` | `idle → loading(엔진 다운로드) → starting(카메라 기동) → running` / `error` |
| `error` | status가 error일 때 사용자에게 보여줄 메시지 |
| `recenterCount` | recenter 실행 횟수 (탭 + 코치마커) |
| `contentVisible` | MainScene 공개 여부 — 코치마커 확인 시 true |
| `isRunning` | `$derived(status === 'running')` |

## 5. 화면 플로우 (상태 머신)

```
[Start] 시작하기 클릭 (started = true)
   ↓ ARScene 마운트 → 엔진 로드/카메라 기동 동안 [Splash "로딩중.."]
   ↓ 카메라 ON — 파이프라인 onStart → xr.status = 'running'
   ├─ [MainScene] 즉시 마운트: 콘텐츠 그룹을 visible=false로 scene에 추가
   │               + renderer.compile()로 셰이더/텍스처 사전 GPU 업로드
   └─ [Coach] "화면을 탭하면 카메라가 새로 정렬됩니다." 팝업
   ↓ 코치 시작하기 클릭
   →  XR8.XrController.recenter()  →  xr.contentVisible = true
   →  [MainScene 공개 (버벅임 없음)] + [MainUI 하단 안내]
```

데스크톱에서는 카메라가 시작되지 않으므로 `running`에 도달하지 않고,
LandingPage 모듈의 QR 페이지(z-index 815)가 Splash(z-index 20) 위에 표시된다.

## 6. 핵심 설계 결정

1. **스크립트 동적 주입** (`engine-loader.ts`) — app.html 정적 태그 대신 브라우저에서
   주입: AR을 쓰는 페이지에서만 엔진(≈수 MB)을 받고, SSR과 무관하며, 중복 주입을
   모듈 스코프 Promise 캐시로 방지.
2. **attachment로 세션 수명주기 관리** (`ARScene.svelte`) — `{@attach arSession}`이
   캔버스 마운트 시 세션을 시작하고, cleanup에서 `XR8.stop()` +
   `clearCameraPipelineModules()` + `xr.reset()`. SPA 네비게이션에 안전.
3. **사전 컴파일 공개 전략** (`MainScene.svelte`) — `visible=false`만으로는 three.js가
   렌더를 건너뛰어 공개 첫 프레임에 셰이더 컴파일이 몰린다. 코치마커 단계에서
   `group.visible=true → renderer.compile() → visible=false`(동기 블록이라 화면 노출
   없음)로 미리 컴파일해 공개를 즉시 처리.
4. **`untrack`으로 재생성 방지** (`MainScene.svelte`) — 씬 생성 `$effect` 안에서
   `xr.contentVisible`을 그대로 읽으면 공개 시 effect가 재실행되어 씬이 통째로
   재생성된다. `untrack(() => xr.contentVisible)`로 의존성을 끊고, visibility 토글은
   별도의 작은 `$effect`가 담당.
5. **`--host` 감지 자동 HTTPS** (`vite.config.ts`) — `http://localhost`는 secure
   context라 데스크톱 개발은 HTTP로 충분. `npm run dev -- --host` 실행 시
   `process.argv` 감지로 `@vitejs/plugin-basic-ssl`을 활성화해 폰(LAN) 테스트 지원.
6. **UI 레이어 z-index 규약** — 캔버스(기본) < MainUI/ArHud(10) < Splash(20) <
   Coach(25) < Start(30) < 8th Wall LandingPage(815, 엔진 소유).
   MainUI 레이어는 `pointer-events: none`으로 탭 recenter 제스처를 통과시킨다.

## 7. 개발·테스트

```bash
npm run dev              # 데스크톱 개발 (http://localhost:5173, QR 랜딩 확인)
npm run dev -- --host    # 폰 테스트 (자동 https, Network 주소로 접속)
npm run check            # svelte-check 타입 검사
npm run build            # 프로덕션 빌드
```

폰 테스트 절차: Network 주소 접속 → 자체서명 인증서 승인 → 카메라 허용 →
시작하기 → 코치마커 확인 → 바닥을 향해 천천히 움직이며 큐브 확인.
