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
	name: 'KFC 수원장안DT점 Web AR',
	title: 'KFC 수원장안DT점(드라이브 스루) 컬처월 Web AR 체험 | 웹 기반 증강현실',
	description:
		'KFC 수원장안DT점(경기도 수원시 장안구 경수대로 992, 드라이브 스루 매장)의 컬처월 — ' +
		'수원화성과 KFC 버켓을 접목한 설치미술 — 을 위한 웹 기반 증강현실(Web AR / WebXR) 콘텐츠. ' +
		'앱 설치 없이 모바일 브라우저에서 QR로 접속해 카메라로 벽면 조형물을 비추면 KFC 캐슬이 나타나고, ' +
		'터치하면 KFC의 11 Herbs & Spices 오리지널 레시피 파우더와 함께 치킨과 KFC 박스가 쏟아지는 인터랙티브 AR 체험을 즐길 수 있습니다.',
	keywords: [
		'KFC',
		'KFC 수원장안DT점',
		'KFC 수원 장안점',
		'KFC 수원장안점',
		'KFC 드라이브 스루',
		'KFC DT',
		'수원 KFC',
		'경수대로 992',
		'수원화성',
		'컬처월',
		'11 Herbs & Spices',
		'Web AR',
		'WebXR',
		'웹 증강현실',
		'증강현실',
		'AR 체험',
		'QR AR',
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
		name: 'KFC 수원장안DT점',
		alternateName: ['KFC 수원 장안점 드라이브 스루', 'KFC 수원장안점 DT', 'KFC Suwon Jangan DT'],
		brand: 'KFC',
		streetAddress: '경수대로 992',
		addressLocality: '장안구, 수원시',
		addressRegion: '경기도',
		addressCountry: 'KR',
		mapUrl: 'https://maps.app.goo.gl/CQ12ZjngSarbwnubA',
		/** 신아일보, 2026-05-27: 수원장안DT점 오픈 (컬처월 = 수원화성 × KFC 버켓 설치미술, QR AR 콘텐츠). */
		newsUrl: 'https://www.shinailbo.co.kr/news/articleView.html?idxno=5024507',
		openingDate: '2026-05-27',
		description:
			'드라이브 스루 매장. 브랜드 굿즈 MD존과 수원화성 × KFC 버켓 설치미술 컬처월을 갖추고, ' +
			'QR코드로 접속하는 11 Herbs & Spices 오리지널 레시피 증강현실(AR) 콘텐츠를 제공합니다.'
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
