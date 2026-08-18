<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<script lang="ts">
	import ARScene from '$lib/components/ARScene.svelte'
	import ArHud from '$lib/components/ArHud.svelte'
	import Coach from '$lib/components/Coach.svelte'
	import MainScene from '$lib/components/MainScene.svelte'
	import MainUI from '$lib/components/MainUI.svelte'
	import Splash from '$lib/components/Splash.svelte'
	import Start from '$lib/components/Start.svelte'
	import DesktopLanding from '$lib/components/DesktopLanding.svelte'
	import { isDesktopVisitor } from '$lib/xr/device'
	import { xr } from '$lib/xr/xr-state.svelte'
	import { CREATOR, SITE, SITE_URL } from '$lib/site'

	const ogImage = SITE_URL + SITE.ogImagePath

	// schema.org graph: the Web AR app + the KFC store it is made for + the creator.
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': ['WebApplication', 'CreativeWork'],
				'@id': `${SITE_URL}/#app`,
				name: SITE.name,
				headline: SITE.title,
				description: SITE.description,
				url: SITE_URL,
				image: ogImage,
				inLanguage: SITE.language,
				applicationCategory: 'EntertainmentApplication',
				applicationSubCategory: 'Augmented Reality (WebXR / Web AR)',
				operatingSystem: 'iOS, Android',
				browserRequirements: 'Requires a mobile browser with camera access (Safari, Chrome)',
				isAccessibleForFree: true,
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
				keywords: SITE.keywords.join(', '),
				about: { '@id': `${SITE_URL}/#store` },
				locationCreated: { '@id': `${SITE_URL}/#store` },
				creator: { '@id': `${SITE_URL}/#creator` },
				author: { '@id': `${SITE_URL}/#creator` },
				copyrightHolder: { '@id': `${SITE_URL}/#creator` },
				copyrightYear: CREATOR.year,
				copyrightNotice: `© ${CREATOR.year} ${CREATOR.name}. All rights reserved.`,
				license: `${SITE_URL}/#license`
			},
			{
				'@type': ['Restaurant', 'FastFoodRestaurant'],
				'@id': `${SITE_URL}/#store`,
				name: SITE.store.name,
				alternateName: [...SITE.store.alternateName],
				description: SITE.store.description,
				brand: { '@type': 'Brand', name: SITE.store.brand },
				servesCuisine: 'Fried chicken',
				hasDriveThroughService: true,
				hasMap: SITE.store.mapUrl,
				subjectOf: {
					'@type': 'NewsArticle',
					url: SITE.store.newsUrl,
					headline: 'KFC 수원장안DT점 오픈 — MD존·컬처월·AR 콘텐츠',
					datePublished: SITE.store.openingDate,
					publisher: { '@type': 'Organization', name: '신아일보' }
				},
				address: {
					'@type': 'PostalAddress',
					streetAddress: SITE.store.streetAddress,
					addressLocality: SITE.store.addressLocality,
					addressRegion: SITE.store.addressRegion,
					addressCountry: SITE.store.addressCountry
				},
				amenityFeature: [
					{ '@type': 'LocationFeatureSpecification', name: '드라이브 스루 (Drive-Thru)', value: true },
					{ '@type': 'LocationFeatureSpecification', name: '컬처월 (수원화성 × KFC 버켓 설치미술)', value: true },
					{ '@type': 'LocationFeatureSpecification', name: 'MD존 (브랜드 굿즈)', value: true },
					{ '@type': 'LocationFeatureSpecification', name: 'QR Web AR 콘텐츠', value: true }
				]
			},
			{
				'@type': ['Person', 'Organization'],
				'@id': `${SITE_URL}/#creator`,
				name: CREATOR.name,
				description: CREATOR.role,
				jobTitle: CREATOR.role,
				knowsAbout: ['Web AR', 'WebXR', 'Augmented Reality', '8th Wall', 'three.js', 'SvelteKit'],
				url: CREATOR.url
			}
		]
	})

	// The AR session only mounts after the user taps 시작하기 on the start screen.
	let started = $state(false)

	// Desktop browsers get the QR handoff page instead of the AR flow (decided after
	// hydration so the prerendered HTML — Start screen + SEO copy — stays identical).
	let desktop = $state(false)
	$effect(() => {
		desktop = isDesktopVisitor()
	})

	// Custom splash covers the screen from tap until the camera feed is running.
	const showSplash = $derived(
		started && (xr.status === 'loading' || xr.status === 'starting')
	)
</script>

<svelte:head>
	<!-- SEO / GEO -->
	<title>{SITE.title}</title>
	<meta name="description" content={SITE.description} />
	<meta name="keywords" content={SITE.keywords.join(', ')} />
	<meta name="author" content={CREATOR.name} />
	<meta name="creator" content="{CREATOR.name} — {CREATOR.role}" />
	<meta name="copyright" content="© {CREATOR.year} {CREATOR.name}. All rights reserved." />
	<meta name="robots" content="index, follow, max-image-preview:large" />
	<meta name="theme-color" content="#e1021f" />
	<meta name="application-name" content={SITE.name} />
	<meta name="apple-mobile-web-app-title" content={SITE.name} />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="format-detection" content="telephone=no" />
	<meta name="geo.region" content="KR-41" />
	<meta name="geo.placename" content="경기도 수원시 장안구 경수대로 992 (KFC 수원장안DT점)" />
	<link rel="canonical" href={SITE_URL} />
	<link rel="alternate" hreflang="ko" href={SITE_URL} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:title" content={SITE.title} />
	<meta property="og:description" content={SITE.description} />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{SITE.name} — Web AR 체험" />
	<meta property="og:locale" content={SITE.locale} />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={SITE.title} />
	<meta name="twitter:description" content={SITE.description} />
	<meta name="twitter:image" content={ogImage} />

	<!-- Structured data (schema.org) for search & AI engines -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

{#if desktop}
	<DesktopLanding />
{:else if !started}
	<Start onstart={() => (started = true)} />
{:else}
	<ARScene />
	<ArHud />
	{#if xr.isRunning}
		<!-- MainScene mounts immediately (invisible + pre-compiled); the coach
		     marker sits on top until the user confirms, then recenter + reveal. -->
		<MainScene />
		{#if xr.contentVisible}
			<MainUI />
		{:else}
			<Coach />
		{/if}
	{/if}
	{#if showSplash}
		<Splash />
	{/if}
{/if}
