/*!
 * KFC 수원 장안점 드라이브 스루 — Web AR (WebXR) experience
 *
 * Created by OOMG — Web-based Augmented Reality / WebXR / AR creator.
 * Copyright (c) 2026 OOMG. All rights reserved.
 *
 * This source code is proprietary. Copying, use, modification, or
 * redistribution of any part of it, in any form, is NOT permitted
 * without the prior written consent of the author. See LICENSE.md.
 */

// Single source of truth for SEO / GEO metadata and the creator credit.
// Update SITE_URL when the client-facing custom domain is connected.

export const SITE_URL = 'https://kfc-bundle-2026.vercel.app'

export const SITE = {
	name: 'KFC 수원 장안점 드라이브 스루 AR',
	title: 'KFC 수원 장안점 드라이브 스루 매장 Web AR 체험 | 웹 기반 증강현실',
	description:
		'KFC 수원 장안점 드라이브 스루 매장을 위한 웹 기반 증강현실(Web AR / WebXR) 콘텐츠. ' +
		'앱 설치 없이 모바일 브라우저에서 카메라로 매장 벽면을 비추면 KFC 캐슬이 나타나고, ' +
		'터치하면 치킨과 KFC 박스가 쏟아지는 인터랙티브 AR 체험을 즐길 수 있습니다.',
	keywords: [
		'KFC',
		'KFC 수원 장안점',
		'KFC 드라이브 스루',
		'수원 KFC',
		'장안점',
		'Web AR',
		'WebXR',
		'웹 증강현실',
		'증강현실',
		'AR 체험',
		'8th Wall',
		'월드 트래킹',
		'모바일 AR',
		'KFC AR',
		'OOMG'
	],
	locale: 'ko_KR',
	language: 'ko',
	ogImagePath: '/og.png',
	/** The store this experience is built for (structured data). */
	store: {
		name: 'KFC 수원 장안점 (드라이브 스루)',
		brand: 'KFC',
		addressLocality: '수원시',
		addressRegion: '경기도',
		addressCountry: 'KR'
	}
} as const

/** Creator credit — embedded in the HTML/meta/JSON-LD/JS banner. */
export const CREATOR = {
	name: 'OOMG',
	role: 'Web-based Augmented Reality / WebXR / AR Creator',
	url: 'https://github.com/mingeunoh6',
	email: 'mingeunoh6@gmail.com',
	year: 2026,
	notice:
		'Created by OOMG (Web AR / WebXR / AR creator). Copyright (c) 2026 OOMG. All rights reserved. ' +
		'Unauthorized copying, use, modification or redistribution of this source code is prohibited.'
} as const
