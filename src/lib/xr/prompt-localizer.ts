/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// The 8th Wall engine binary shows a few DOM prompts of its own (e.g. the iOS
// "AR requires access to device motion sensors" box, `.prompt-box-8w`) that are
// created imperatively on document.body with English copy. We can't configure
// them, so we watch for their insertion and swap the copy; the KFC look is
// applied via global CSS in +layout.svelte.

const TEXT: Record<string, string> = {
	'AR requires access to device motion sensors': 'AR 체험을 위해 기기의 모션 센서 접근 권한이 필요합니다',
	Cancel: '취소',
	Continue: '계속'
}

const localize = (root: Element) => {
	const boxes = root.matches('.prompt-box-8w')
		? [root]
		: Array.from(root.querySelectorAll('.prompt-box-8w'))
	for (const box of boxes) {
		for (const el of box.querySelectorAll('p, button')) {
			const key = el.textContent?.trim() ?? ''
			if (key in TEXT) el.textContent = TEXT[key]
		}
	}
}

/**
 * Starts watching for engine prompts and localizes them. Returns a cleanup.
 */
export const installPromptLocalizer = (): (() => void) => {
	if (typeof document === 'undefined') return () => {}

	localize(document.body)

	const observer = new MutationObserver((mutations) => {
		for (const m of mutations) {
			for (const node of m.addedNodes) {
				if (node instanceof Element) localize(node)
			}
		}
	})
	observer.observe(document.body, { childList: true, subtree: true })
	return () => observer.disconnect()
}
