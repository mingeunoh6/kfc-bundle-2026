/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// Cheap device check used before the engine is loaded: on desktop we skip the AR
// session entirely and show DesktopLanding (QR handoff) instead of Start.
// Replaces the 8th Wall landing-page module's own detection.

/** True on phones/tablets (incl. iPadOS reporting a Mac UA with touch). */
export const isMobileDevice = (): boolean => {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent
	if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true
	// iPadOS 13+ pretends to be a Mac; touch points give it away.
	if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true
	return false
}

/** `?mobile` forces the AR flow (handy for desktop debugging with a webcam). */
export const isDesktopVisitor = (): boolean => {
	if (typeof window === 'undefined') return false
	if (new URLSearchParams(window.location.search).has('mobile')) return false
	return !isMobileDevice()
}
