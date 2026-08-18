/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// KFC castle entrance + wall spread + burst & spice powder effect.
//
// Framework-free port of the Mattercraft `KfcEffectComponent` (kfctest.ts).
// The zcomponent plumbing (ContextManager, Observable, registerLoadable,
// useOnBeforeRender) is replaced by:
//   - `cfg`            a plain config object (see kfc-config.ts)
//   - `load()`         async GLB loading + scene graph construction
//   - `startEntrance()` explicit start (the original auto-started after load)
//   - `update(dt)`     to be called once per rendered frame
//   - `triggerBurst()` the old `fire` observable
//   - `dispose()`
//
// Everything is built under `this.root` (a THREE.Group) which the caller adds
// wherever the effect should live — here: the virtual wall anchor in MainScene.

import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DEFAULT_KFC_CONFIG, KFC_MODEL_URLS, type KfcEffectConfig } from './kfc-config'

type InstancedPart = {
	mesh: THREE.InstancedMesh
	localMatrix: THREE.Matrix4
	geometry: THREE.BufferGeometry
	material: THREE.Material | THREE.Material[]
}

type LoadedModel = {
	name: string
	parts: InstancedPart[]
	boundingSize: THREE.Vector3
	minY: number
}

type WallTarget = {
	pos: THREE.Vector3
	col: number
}

type BurstBody = {
	pos: THREE.Vector3
	vel: THREE.Vector3
	rot: THREE.Euler
	angVel: THREE.Vector3
	grounded: boolean
	scale: number
}

type BurstGroup = {
	model: LoadedModel
	bodies: BurstBody[]
	count: number
	scale: number
}

type ParticleBody = {
	pos: THREE.Vector3
	vel: THREE.Vector3
	life: number
	maxLife: number
	size: number
	color: THREE.Color
	sprite: THREE.Sprite
	type: number
}

export type KfcPhase = 'loading' | 'ready' | 'entrance' | 'idle' | 'burst'

export interface KfcEffectEvents {
	/** Called whenever the phase changes. */
	onPhase?: (phase: KfcPhase) => void
	/** Called with a 0..1 download progress while loading. */
	onProgress?: (ratio: number) => void
	/** Called each time a burst is fired. */
	onBurst?: () => void
}

export class KfcEffect {
	/** Group holding every object of the effect. Add it to your scene. */
	readonly root = new THREE.Group()
	readonly cfg: KfcEffectConfig

	private events: KfcEffectEvents

	private castleModel?: THREE.Object3D
	private castleTargetScale = 1
	private castleBaseY = 0
	private castleBasePos = new THREE.Vector3()
	private castleEntranceZOffset = 0
	private castleEmergeShake = new THREE.Vector3()
	private entranceDustTriggered = false

	private rockModel?: THREE.Object3D

	private wallBoxModel?: LoadedModel
	private burstBoxModel?: LoadedModel
	private chickenModel?: LoadedModel

	private wallMeshes: THREE.InstancedMesh[] = []
	private wallTargets: WallTarget[] = []
	private wallCount = 0
	private wallBoxScale = 1

	private layoutMatrix = new THREE.Matrix4()

	private burstGroups: BurstGroup[] = []
	private burstActive = false
	private burstTime = 0

	private particleGroup?: THREE.Group
	private particleBodies: ParticleBody[] = []
	private particlesActive = false
	private powderTexture?: THREE.CanvasTexture

	private entranceDustGroup?: THREE.Group
	private entranceDustBodies: ParticleBody[] = []
	private entranceDustActive = false

	private burstFloorMesh?: THREE.Mesh
	private burstFloorGeometry?: THREE.PlaneGeometry
	private burstFloorMaterial?: THREE.MeshBasicMaterial

	private shadowFloorMesh?: THREE.Mesh
	private shadowFloorGeometry?: THREE.PlaneGeometry
	private shadowFloorMaterial?: THREE.ShadowMaterial

	private _phase: KfcPhase = 'loading'
	private entranceTime = 0

	private loaded = false
	private disposed = false
	private autoFireTimer: number | undefined

	private hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0)

	private _m = new THREE.Matrix4()
	private _m2 = new THREE.Matrix4()
	private _p = new THREE.Vector3()
	private _q = new THREE.Quaternion()
	private _s = new THREE.Vector3()

	private wallRotQuat = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0, 1, 0),
		Math.PI / 2
	)

	constructor(config: Partial<KfcEffectConfig> = {}, events: KfcEffectEvents = {}) {
		this.cfg = { ...DEFAULT_KFC_CONFIG, ...config }
		this.events = events
		this.root.name = 'KfcEffect'
	}

	get phase(): KfcPhase {
		return this._phase
	}

	get isLoaded(): boolean {
		return this.loaded
	}

	private setPhase(p: KfcPhase) {
		if (this._phase === p) return
		this._phase = p
		this.events.onPhase?.(p)
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Loading
	// ─────────────────────────────────────────────────────────────────────────

	/** Loads the five GLBs and builds the scene graph under `root`. */
	async load(): Promise<void> {
		if (this.loaded) return

		const loader = new GLTFLoader()
		const urls = [
			KFC_MODEL_URLS.castle,
			KFC_MODEL_URLS.rock,
			KFC_MODEL_URLS.wallBox,
			KFC_MODEL_URLS.burstBox,
			KFC_MODEL_URLS.chicken
		]
		const progress = new Array<number>(urls.length).fill(0)
		const report = () => {
			const ratio = progress.reduce((a, b) => a + b, 0) / urls.length
			this.events.onProgress?.(ratio)
		}

		const loadOne = (url: string, i: number): Promise<GLTF> =>
			loader.loadAsync(url, (e) => {
				if (e.lengthComputable && e.total > 0) {
					progress[i] = Math.min(1, e.loaded / e.total)
					report()
				}
			})

		const [castleGltf, rockGltf, wallBoxGltf, burstBoxGltf, chickenGltf] = await Promise.all(
			urls.map((u, i) => loadOne(u, i).then((g) => ((progress[i] = 1), report(), g)))
		)

		if (this.disposed) return

		this.setupCastle(castleGltf.scene)
		this.setupRock(rockGltf.scene)

		this.wallBoxModel = this.extractModel(wallBoxGltf.scene, 'kfcbox_source')
		this.burstBoxModel = this.extractModel(burstBoxGltf.scene, 'kfcbox')
		this.chickenModel = this.extractModel(chickenGltf.scene, 'chicken')

		this.setupWalls()
		this.setupBurst()
		this.setupParticles()
		this.setupEntranceDust()
		this.setupBurstFloorDebug()

		this.updateLayoutTransform()

		this.loaded = true
		this.setPhase('ready')
	}

	/**
	 * Objects the user can tap to fire the burst: castle (+ rock) and the wall
	 * boxes. Floors and particle sprites are excluded on purpose.
	 */
	getTapTargets(): THREE.Object3D[] {
		const targets: THREE.Object3D[] = []
		if (this.castleModel) targets.push(this.castleModel)
		targets.push(...this.wallMeshes)
		return targets
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Live config updates (replaces the Observable side-effect callbacks)
	// ─────────────────────────────────────────────────────────────────────────

	/** Merges `patch` into `cfg` and re-applies every dependent transform. */
	setConfig(patch: Partial<KfcEffectConfig>) {
		Object.assign(this.cfg, patch)
		if (!this.loaded) return

		this.applyCastleScale()
		this.applyRockTransform()
		this.applyWallLayoutChanges()
		this.applyBurstScale()

		if (this.burstFloorMesh) {
			this.burstFloorMesh.position.y = this.cfg.burstFloorY
			this.burstFloorMesh.position.z = this.cfg.burstFloorZ
			this.burstFloorMesh.visible = this.cfg.showBurstFloorDebug
		}
		if (this.shadowFloorMesh && this.shadowFloorMaterial) {
			this.shadowFloorMesh.position.y = this.cfg.burstFloorY
			this.shadowFloorMesh.position.z = this.cfg.burstFloorZ
			this.shadowFloorMaterial.opacity = this.cfg.shadowFloorOpacity
			this.shadowFloorMesh.visible = this.cfg.shadowFloorOpacity > 0
			this.shadowFloorMesh.scale.set(this.cfg.shadowFloorSize / 8, this.cfg.shadowFloorSize / 8, 1)
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Setup
	// ─────────────────────────────────────────────────────────────────────────

	private setupBurstFloorDebug() {
		this.burstFloorGeometry = new THREE.PlaneGeometry(8, 8)
		this.burstFloorMaterial = new THREE.MeshBasicMaterial({
			color: 0x00ffaa,
			transparent: true,
			opacity: 0.18,
			depthWrite: false,
			side: THREE.DoubleSide
		})
		this.burstFloorMesh = new THREE.Mesh(this.burstFloorGeometry, this.burstFloorMaterial)
		this.burstFloorMesh.rotation.x = -Math.PI / 2
		this.burstFloorMesh.position.y = this.cfg.burstFloorY
		this.burstFloorMesh.position.z = this.cfg.burstFloorZ
		this.burstFloorMesh.visible = this.cfg.showBurstFloorDebug
		this.burstFloorMesh.name = 'BurstFloorDebug'
		this.root.add(this.burstFloorMesh)

		// Invisible shadow-catcher plane: only the shadows cast by the
		// wall/burst meshes show through. Sized via shadowFloorSize.
		const baseSize = 8
		this.shadowFloorGeometry = new THREE.PlaneGeometry(baseSize, baseSize)
		this.shadowFloorMaterial = new THREE.ShadowMaterial({
			opacity: this.cfg.shadowFloorOpacity,
			transparent: true
		})
		this.shadowFloorMesh = new THREE.Mesh(this.shadowFloorGeometry, this.shadowFloorMaterial)
		this.shadowFloorMesh.rotation.x = -Math.PI / 2
		this.shadowFloorMesh.position.y = this.cfg.burstFloorY
		this.shadowFloorMesh.position.z = this.cfg.burstFloorZ
		this.shadowFloorMesh.scale.set(
			this.cfg.shadowFloorSize / baseSize,
			this.cfg.shadowFloorSize / baseSize,
			1
		)
		this.shadowFloorMesh.receiveShadow = true
		this.shadowFloorMesh.visible = this.cfg.shadowFloorOpacity > 0
		this.shadowFloorMesh.name = 'ShadowCatcherFloor'
		this.root.add(this.shadowFloorMesh)
	}

	private extractModel(root: THREE.Object3D, name: string): LoadedModel {
		root.updateMatrixWorld(true)

		const bbox = new THREE.Box3().setFromObject(root)
		const size = new THREE.Vector3()
		bbox.getSize(size)

		const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert()

		const model: LoadedModel = {
			name,
			parts: [],
			boundingSize: size.clone(),
			minY: bbox.min.y
		}

		root.traverse((child) => {
			const mesh = child as THREE.Mesh
			if (!mesh.isMesh || !mesh.geometry || !mesh.material) return

			mesh.updateMatrixWorld(true)

			const localMatrix = new THREE.Matrix4().copy(rootInverse).multiply(mesh.matrixWorld)

			model.parts.push({
				mesh: undefined as unknown as THREE.InstancedMesh,
				localMatrix,
				geometry: mesh.geometry,
				material: mesh.material
			})
		})

		return model
	}

	private buildInstancedMeshes(model: LoadedModel, count: number): THREE.InstancedMesh[] {
		const meshes: THREE.InstancedMesh[] = []

		for (const part of model.parts) {
			const geometry = part.geometry.clone()
			const material = this.cloneMaterial(part.material)

			const instanced = new THREE.InstancedMesh(geometry, material, count)
			instanced.castShadow = true
			instanced.receiveShadow = true
			instanced.frustumCulled = false
			instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

			for (let i = 0; i < count; i++) {
				instanced.setMatrixAt(i, this.hiddenMatrix)
			}
			instanced.instanceMatrix.needsUpdate = true

			instanced.userData.localMatrix = part.localMatrix

			this.root.add(instanced)
			meshes.push(instanced)
		}

		return meshes
	}

	private setupCastle(root: THREE.Object3D) {
		this.castleModel = root

		const bbox = new THREE.Box3().setFromObject(root)
		const size = new THREE.Vector3()
		bbox.getSize(size)
		const center = new THREE.Vector3()
		bbox.getCenter(center)

		const targetH = this.cfg.castleHeight
		this.castleTargetScale = targetH / Math.max(0.001, size.y)

		this.castleBaseY = -bbox.min.y * this.castleTargetScale + this.cfg.groundY

		this.castleBasePos.set(
			-center.x * this.castleTargetScale,
			this.castleBaseY,
			-center.z * this.castleTargetScale
		)

		root.traverse((child) => {
			const mesh = child as THREE.Mesh
			if (mesh.isMesh) {
				mesh.castShadow = true
				mesh.receiveShadow = true
			}
		})

		root.scale.setScalar(0.001)
		root.name = 'KfcCastle'

		this.root.add(root)

		this.applyCastleTransform()
	}

	/**
	 * Applies the user-controlled castle position offsets (X/Y/Z) on top of
	 * the auto-centered base position, plus the castle's rotation.
	 * The Z-axis rotation from `layoutRotationZ` is applied in
	 * updateLayoutTransform and re-applied here so both stay in sync.
	 */
	private applyCastleTransform() {
		if (!this.castleModel) return

		this.castleModel.position.set(
			this.castleBasePos.x + this.cfg.castlePositionX + this.castleEmergeShake.x,
			this.castleBasePos.y + this.cfg.castlePositionY + this.castleEmergeShake.y,
			this.castleBasePos.z +
				this.cfg.castlePositionZ +
				this.castleEntranceZOffset +
				this.castleEmergeShake.z
		)

		this.castleModel.rotation.y = THREE.MathUtils.degToRad(this.cfg.castleRotationY)
		this.castleModel.rotation.x = THREE.MathUtils.degToRad(this.cfg.castleRotationX)
		this.castleModel.rotation.z = THREE.MathUtils.degToRad(this.cfg.castleRotationZ)
	}

	/**
	 * Parents the rock backing element to the castle so it inherits all of the
	 * castle's transforms (entrance emerge, shake, rotations).
	 */
	private setupRock(root: THREE.Object3D) {
		this.rockModel = root

		root.traverse((child) => {
			const mesh = child as THREE.Mesh
			if (mesh.isMesh) {
				mesh.castShadow = true
				mesh.receiveShadow = true
			}
		})

		root.name = 'KfcCastleRock'

		if (this.castleModel) {
			this.castleModel.add(root)
		} else {
			this.root.add(root)
		}

		this.applyRockTransform()
	}

	private applyRockTransform() {
		if (!this.rockModel) return

		this.rockModel.position.set(
			this.cfg.rockPositionX,
			this.cfg.rockPositionY,
			this.cfg.rockPositionZ
		)

		this.rockModel.rotation.set(
			THREE.MathUtils.degToRad(this.cfg.rockRotationX),
			THREE.MathUtils.degToRad(this.cfg.rockRotationY),
			THREE.MathUtils.degToRad(this.cfg.rockRotationZ),
			'XYZ'
		)

		this.rockModel.scale.setScalar(this.cfg.rockScale)
	}

	private applyCastleScale() {
		if (!this.castleModel) return

		const bbox = new THREE.Box3().setFromObject(this.castleModel)
		const size = new THREE.Vector3()
		bbox.getSize(size)

		if (size.y > 0) {
			const inverseScale = 1 / Math.max(0.001, this.castleModel.scale.x)
			const realY = size.y * inverseScale
			this.castleTargetScale = this.cfg.castleHeight / Math.max(0.001, realY)
		}

		this.applyCastleTransform()
	}

	private setupWalls() {
		if (!this.wallBoxModel) return

		this.updateWallRotation()
		this.rebuildWallTargets()

		this.wallMeshes = this.buildInstancedMeshes(this.wallBoxModel, this.wallCount)
		for (const mesh of this.wallMeshes) {
			mesh.count = this.wallCount
		}
	}

	private updateWallRotation() {
		const rx = THREE.MathUtils.degToRad(this.cfg.wallBoxRotationX)
		const ry = THREE.MathUtils.degToRad(this.cfg.wallBoxRotationY)
		const rz = THREE.MathUtils.degToRad(this.cfg.wallBoxRotationZ)
		this.wallRotQuat.setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'))
	}

	private rebuildWallTargets() {
		if (!this.wallBoxModel) return

		const sz = this.wallBoxModel.boundingSize
		const maxDim = Math.max(sz.x, sz.y, sz.z)
		this.wallBoxScale = (0.45 / maxDim) * this.cfg.wallBoxScaleMultiplier

		const bw = sz.x * this.wallBoxScale
		const bh = sz.y * this.wallBoxScale
		const bd = sz.z * this.wallBoxScale

		// Pick effective horizontal/depth dims based on the dominant rotation,
		// so spacing reads correctly when the boxes are rotated.
		const ryDeg = ((this.cfg.wallBoxRotationY % 360) + 360) % 360
		const rotated = (ryDeg > 45 && ryDeg < 135) || (ryDeg > 225 && ryDeg < 315)
		const effW = rotated ? bd : bw
		const effD = rotated ? bw : bd

		const spacingX = this.cfg.wallSpacingX
		const spacingY = this.cfg.wallSpacingY
		const spacingZ = this.cfg.wallSpacingZ

		const targets: WallTarget[] = []
		const startOffset = this.cfg.wallStartOffset
		const wallRows = this.cfg.wallRows
		const wallPerSide = this.cfg.wallPerSide
		const wallDepthRows = this.cfg.wallDepth

		for (const side of [-1, 1]) {
			for (let row = 0; row < wallRows; row++) {
				const isTopRow = row === wallRows - 1

				for (let col = 0; col < wallPerSide; col++) {
					if (isTopRow && col % 2 === 1) continue

					const brickOffset = row % 2 === 1 ? effW * spacingX * 0.5 : 0

					for (let d = 0; d < wallDepthRows; d++) {
						const dist = startOffset + col * effW * spacingX + brickOffset
						const x = side * dist
						const y = this.cfg.groundY + bh * 0.5 + row * bh * spacingY
						const z = d * effD * spacingZ - (wallDepthRows - 1) * effD * spacingZ * 0.5

						targets.push({ pos: new THREE.Vector3(x, y, z), col })
					}
				}
			}
		}

		this.wallTargets = targets
		this.wallCount = targets.length
	}

	private applyWallLayoutChanges() {
		if (!this.loaded || !this.wallBoxModel || this.wallMeshes.length === 0) return

		this.updateLayoutTransform()
		this.updateWallRotation()
		this.rebuildWallTargets()

		// Pool sizes are fixed at load time; clamp in case counts were changed.
		const capacity = this.wallMeshes[0]?.instanceMatrix.count ?? this.wallCount
		this.wallCount = Math.min(this.wallCount, capacity)
		for (const mesh of this.wallMeshes) mesh.count = this.wallCount

		// If we're past the entrance, snap walls to the new positions/rotation
		// immediately. During entrance the animation reads the new targets next
		// frame, so it'll smoothly retarget without us touching matrices here.
		if (this._phase !== 'entrance') {
			for (let i = 0; i < this.wallCount; i++) {
				const target = this.wallTargets[i]
				this._p.copy(target.pos)
				this._q.copy(this.wallRotQuat)
				this._s.setScalar(this.wallBoxScale)
				this._m.compose(this._p, this._q, this._s)
				this._m.premultiply(this.layoutMatrix)
				this.setInstance(this.wallMeshes, i, this._m)
			}
			this.markDirty(this.wallMeshes)
		}
	}

	/**
	 * Updates the layoutMatrix that's applied to wall instances and sets the
	 * castle's Z rotation. Pivot is at (0, groundY, 0) so the whole structure
	 * tilts around the castle base. Burst, particles and shadow floor are
	 * intentionally NOT transformed.
	 */
	private updateLayoutTransform() {
		const z = THREE.MathUtils.degToRad(this.cfg.layoutRotationZ)
		const baseY = this.cfg.groundY

		const tUp = new THREE.Matrix4().makeTranslation(0, baseY, 0)
		const rot = new THREE.Matrix4().makeRotationZ(z)
		const tDn = new THREE.Matrix4().makeTranslation(0, -baseY, 0)
		this.layoutMatrix.identity().multiply(tUp).multiply(rot).multiply(tDn)

		if (this.castleModel) {
			this.castleModel.rotation.z = z
		}
	}

	private setupBurst() {
		if (!this.burstBoxModel || !this.chickenModel) return

		const bSz = this.burstBoxModel.boundingSize
		const burstBoxScale = this.cfg.burstBoxSize / Math.max(bSz.x, bSz.y, bSz.z, 0.001)

		const cSz = this.chickenModel.boundingSize
		const chickenScale = this.cfg.chickenSize / Math.max(cSz.x, cSz.y, cSz.z, 0.001)

		const boxMeshes = this.buildInstancedMeshes(this.burstBoxModel, this.cfg.burstBoxCount)
		const chickenMeshes = this.buildInstancedMeshes(this.chickenModel, this.cfg.burstChickenCount)

		// Keep burst meshes visible from the start with scale-0 instance
		// matrices so they're invisible visually but still rendered. This
		// pre-warms the shader cache and prevents the first fire from
		// stalling on shader compilation.
		for (const mesh of [...boxMeshes, ...chickenMeshes]) {
			mesh.visible = true
		}

		const boxParts: InstancedPart[] = boxMeshes.map((m, i) => ({
			mesh: m,
			localMatrix: m.userData.localMatrix,
			geometry: this.burstBoxModel!.parts[i].geometry,
			material: this.burstBoxModel!.parts[i].material
		}))

		const chickenParts: InstancedPart[] = chickenMeshes.map((m, i) => ({
			mesh: m,
			localMatrix: m.userData.localMatrix,
			geometry: this.chickenModel!.parts[i].geometry,
			material: this.chickenModel!.parts[i].material
		}))

		this.burstGroups = [
			{
				model: { ...this.burstBoxModel, parts: boxParts },
				bodies: [],
				count: this.cfg.burstBoxCount,
				scale: burstBoxScale
			},
			{
				model: { ...this.chickenModel, parts: chickenParts },
				bodies: [],
				count: this.cfg.burstChickenCount,
				scale: chickenScale
			}
		]
	}

	private applyBurstScale() {
		if (!this.loaded || this.burstGroups.length === 0) return

		if (this.burstBoxModel && this.burstGroups[0]) {
			const bSz = this.burstBoxModel.boundingSize
			this.burstGroups[0].scale = this.cfg.burstBoxSize / Math.max(bSz.x, bSz.y, bSz.z, 0.001)
		}

		if (this.chickenModel && this.burstGroups[1]) {
			const cSz = this.chickenModel.boundingSize
			this.burstGroups[1].scale = this.cfg.chickenSize / Math.max(cSz.x, cSz.y, cSz.z, 0.001)
		}

		for (const grp of this.burstGroups) {
			for (const b of grp.bodies) {
				if (b) b.scale = grp.scale
			}
		}
	}

	private setupParticles() {
		const n = this.cfg.particleCount
		this.powderTexture = this.createPowderTexture()

		this.particleGroup = new THREE.Group()
		this.particleGroup.visible = false
		this.particleGroup.name = 'SpicePowderParticles'
		this.root.add(this.particleGroup)

		for (let i = 0; i < n; i++) {
			const mat = new THREE.SpriteMaterial({
				map: this.powderTexture,
				color: 0xff3300,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.NormalBlending
			})
			const sprite = new THREE.Sprite(mat)
			sprite.scale.set(0.001, 0.001, 0.001)
			this.particleGroup.add(sprite)

			this.particleBodies.push({
				pos: new THREE.Vector3(),
				vel: new THREE.Vector3(),
				life: 0,
				maxLife: 1,
				size: 1,
				color: new THREE.Color(),
				sprite,
				type: 0
			})
		}
	}

	private setupEntranceDust() {
		if (!this.powderTexture) {
			this.powderTexture = this.createPowderTexture()
		}

		this.entranceDustGroup = new THREE.Group()
		this.entranceDustGroup.visible = false
		this.entranceDustGroup.name = 'EntranceDust'
		this.root.add(this.entranceDustGroup)

		for (let i = 0; i < this.cfg.entranceDustCount; i++) {
			const mat = new THREE.SpriteMaterial({
				map: this.powderTexture,
				color: 0x8a7560,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.NormalBlending
			})
			const sprite = new THREE.Sprite(mat)
			sprite.scale.set(0.001, 0.001, 0.001)
			this.entranceDustGroup.add(sprite)

			this.entranceDustBodies.push({
				pos: new THREE.Vector3(),
				vel: new THREE.Vector3(),
				life: 0,
				maxLife: 5,
				size: 1,
				color: new THREE.Color(),
				sprite,
				type: 0
			})
		}
	}

	private triggerEntranceDust() {
		if (!this.entranceDustGroup) return

		this.entranceDustGroup.visible = true
		this.entranceDustActive = true

		const center = new THREE.Vector3(
			this.castleBasePos.x + this.cfg.castlePositionX,
			this.castleBasePos.y + this.cfg.castlePositionY,
			this.castleBasePos.z + this.cfg.castlePositionZ
		)

		const dc = this.cfg.entranceDustColor
		const dustColor = new THREE.Color(dc[0] ?? 0.55, dc[1] ?? 0.45, dc[2] ?? 0.35)
		const baseHSL = { h: 0, s: 0, l: 0 }
		dustColor.getHSL(baseHSL)

		const radius = this.cfg.entranceDustRadius
		const sizeMul = this.cfg.entranceDustSize
		const lifeMul = Math.max(0.01, this.cfg.entranceDustLifeMultiplier)
		const riseSpeed = this.cfg.entranceDustRiseSpeed

		for (let i = 0; i < this.entranceDustBodies.length; i++) {
			const p = this.entranceDustBodies[i]

			const angle = Math.random() * Math.PI * 2
			const r = (0.3 + Math.random() * 1.0) * radius

			p.pos.set(
				center.x + Math.cos(angle) * r,
				center.y + Math.random() * 1.0,
				center.z + Math.sin(angle) * r
			)

			const speed = (1.5 + Math.random() * 3.5) * riseSpeed
			p.vel.set(Math.cos(angle) * speed, (1.2 + Math.random() * 2.6) * riseSpeed, Math.sin(angle) * speed)

			p.maxLife = (1.0 + Math.random() * 1.6) * lifeMul
			p.life = p.maxLife
			p.size = (0.35 + Math.random() * 0.85) * sizeMul

			const h = (baseHSL.h + (Math.random() - 0.5) * 0.04 + 1) % 1
			const s = THREE.MathUtils.clamp(baseHSL.s + (Math.random() - 0.5) * 0.2, 0.05, 0.55)
			const l = THREE.MathUtils.clamp(baseHSL.l * (0.65 + Math.random() * 0.7), 0.18, 0.75)
			p.color.setHSL(h, s, l)

			p.sprite.material.color.copy(p.color)
			p.sprite.position.copy(p.pos)
			p.sprite.scale.setScalar(p.size)
			p.sprite.material.opacity = 0
		}
	}

	private updateEntranceDust(dt: number) {
		if (!this.entranceDustActive || !this.entranceDustGroup) return

		const gravity = this.cfg.gravity
		const opacityMul = this.cfg.entranceDustOpacity
		const gravScale = this.cfg.entranceDustGravityScale
		const drag = Math.max(0, this.cfg.entranceDustDrag)
		const swirl = this.cfg.entranceDustSwirl
		// Higher fadeSoftness → smaller exponent → slower, gentler fade.
		const fadePow = 1 / Math.max(0.05, this.cfg.entranceDustFadeSoftness)

		let anyAlive = false

		for (const p of this.entranceDustBodies) {
			p.life -= dt
			if (p.life <= 0) {
				p.life = 0
				p.sprite.scale.setScalar(0.001)
				p.sprite.material.opacity = 0
				continue
			}

			anyAlive = true

			const ratio = p.life / p.maxLife
			const elapsed = p.maxLife - p.life

			p.vel.y += gravity * gravScale * dt
			p.vel.multiplyScalar(Math.max(0, 1 - drag * dt))
			p.vel.x += (Math.random() - 0.5) * swirl * dt
			p.vel.y += (Math.random() - 0.5) * swirl * 0.5 * dt
			p.vel.z += (Math.random() - 0.5) * swirl * dt

			p.pos.addScaledVector(p.vel, dt)

			const fadeIn = Math.min(1, elapsed * 7)
			const alpha = fadeIn * Math.pow(ratio, fadePow) * opacityMul
			const grow = Math.min(1, elapsed * 1.8)
			const scale = p.size * (0.55 + grow * 0.65) * (0.75 + ratio * 0.25)

			p.sprite.position.copy(p.pos)
			p.sprite.scale.setScalar(scale)
			p.sprite.material.opacity = alpha
		}

		if (!anyAlive) {
			this.entranceDustActive = false
			this.entranceDustGroup.visible = false
		}
	}

	private createPowderTexture(): THREE.CanvasTexture {
		const size = 96
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const ctx = canvas.getContext('2d')!

		// Soft puff with no hot core. Capped peak alpha so overlapping sprites
		// never produce a flash — even a dense cluster reads as layered powder.
		const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
		g.addColorStop(0, 'rgba(255,255,255,0.55)')
		g.addColorStop(0.3, 'rgba(255,255,255,0.42)')
		g.addColorStop(0.6, 'rgba(255,255,255,0.18)')
		g.addColorStop(0.85, 'rgba(255,255,255,0.05)')
		g.addColorStop(1, 'rgba(255,255,255,0)')
		ctx.fillStyle = g
		ctx.fillRect(0, 0, size, size)

		// Soft alpha noise for grain, symmetric around 0.
		const img = ctx.getImageData(0, 0, size, size)
		const data = img.data
		const cx = size / 2
		const cy = size / 2
		const rMax = size / 2
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const i = (y * size + x) * 4
				const dx = x - cx
				const dy = y - cy
				const r = Math.sqrt(dx * dx + dy * dy) / rMax
				if (r < 1) {
					const noiseAmp = 30 * (1 - r)
					const noise = (Math.random() - 0.5) * noiseAmp
					data[i + 3] = Math.max(0, Math.min(255, data[i + 3] + noise))
				}
			}
		}
		ctx.putImageData(img, 0, 0)

		const tex = new THREE.CanvasTexture(canvas)
		tex.needsUpdate = true
		return tex
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Public controls
	// ─────────────────────────────────────────────────────────────────────────

	/** (Re)plays the entrance: castle emerges from the wall, boxes rain down. */
	startEntrance() {
		if (!this.loaded) return

		if (this.autoFireTimer !== undefined) {
			window.clearTimeout(this.autoFireTimer)
			this.autoFireTimer = undefined
		}

		this.setPhase('entrance')
		this.entranceTime = 0
		this.burstActive = false
		this.burstTime = 0
		this.entranceDustTriggered = false
		this.entranceDustActive = false

		if (this.entranceDustGroup) {
			this.entranceDustGroup.visible = false
		}

		if (this.castleModel) {
			this.castleModel.scale.setScalar(0.001)
			this.castleEntranceZOffset = this.cfg.castleEntranceStartZ
			this.castleEmergeShake.set(0, 0, 0)
			this.applyCastleTransform()
		}

		for (const mesh of this.wallMeshes) {
			for (let i = 0; i < this.wallCount; i++) {
				mesh.setMatrixAt(i, this.hiddenMatrix)
			}
			mesh.instanceMatrix.needsUpdate = true
		}

		for (const grp of this.burstGroups) {
			for (const part of grp.model.parts) {
				part.mesh.visible = true
				for (let i = 0; i < grp.count; i++) {
					part.mesh.setMatrixAt(i, this.hiddenMatrix)
				}
				part.mesh.instanceMatrix.needsUpdate = true
			}
		}

		this.particlesActive = false
		if (this.particleGroup) this.particleGroup.visible = false
	}

	/** Fires the burst (boxes + chickens + spice powder). Only in idle/burst. */
	triggerBurst(): boolean {
		if (!this.loaded) return false
		if (this._phase !== 'idle' && this._phase !== 'burst') return false

		this.setPhase('burst')
		this.burstTime = 0
		this.burstActive = true

		const origin = new THREE.Vector3(this.cfg.burstOriginX, this.cfg.burstOriginY, this.cfg.burstOriginZ)

		const forwardVel = this.cfg.burstForwardVelocity
		const upwardVel = this.cfg.burstUpwardVelocity
		const sideVel = this.cfg.burstSideVelocity
		const spreadAngle = THREE.MathUtils.degToRad(this.cfg.burstSpreadAngleDeg)
		const baseZ = this.cfg.burstForwardDirection >= 0 ? 1 : -1
		const randomness = THREE.MathUtils.clamp(this.cfg.burstVelocityRandomness, 0, 1)
		const spin = this.cfg.burstSpin

		const fwdMin = 1 - randomness * 0.6
		const fwdMax = 1 + randomness * 0.85

		for (const grp of this.burstGroups) {
			const reuse = grp.bodies.length === grp.count

			for (let i = 0; i < grp.count; i++) {
				const randomAngle = (Math.random() * 2 - 1) * spreadAngle
				const dirX = Math.sin(randomAngle)
				const dirZ = Math.cos(randomAngle) * baseZ

				const forward = forwardVel * THREE.MathUtils.lerp(fwdMin, fwdMax, Math.random())
				const upward = upwardVel * (0.65 + Math.random() * 0.75)
				const sideNoise = sideVel * (Math.random() * 2 - 1)

				const body: BurstBody = {
					pos: origin
						.clone()
						.add(
							new THREE.Vector3(
								(Math.random() - 0.5) * 0.6,
								Math.random() * 0.4,
								(Math.random() - 0.5) * 0.6
							)
						),
					vel: new THREE.Vector3(dirX * forward + sideNoise, upward, dirZ * forward),
					rot: new THREE.Euler(
						Math.random() * Math.PI * 2,
						Math.random() * Math.PI * 2,
						Math.random() * Math.PI * 2
					),
					angVel: new THREE.Vector3(
						(Math.random() - 0.5) * spin,
						(Math.random() - 0.5) * spin,
						(Math.random() - 0.5) * spin
					),
					grounded: false,
					scale: grp.scale
				}

				if (reuse) {
					grp.bodies[i] = body
				} else {
					grp.bodies.push(body)
				}
			}

			// Write the initial instance matrices NOW so the next render shows
			// bodies at the burst origin even if update() hasn't run yet.
			for (let i = 0; i < grp.count; i++) {
				const b = grp.bodies[i]
				if (!b) continue
				this._q.setFromEuler(b.rot)
				this._s.setScalar(b.scale)
				this._m.compose(b.pos, this._q, this._s)
				this.setInstanceForGroup(grp, i, this._m)
			}
			this.markDirtyForGroup(grp)

			for (const part of grp.model.parts) {
				part.mesh.visible = true
			}
		}

		this.triggerParticles(origin)
		this.events.onBurst?.()
		return true
	}

	private triggerParticles(origin: THREE.Vector3) {
		if (!this.particleGroup) return

		this.particleGroup.visible = true
		this.particlesActive = true

		const n = this.cfg.particleCount
		// Distribution:
		//  hero chunks  10%  — large opaque lumps near center
		//  streaks      25%  — long radial jets fanning out
		//  halo         12%  — huge soft puffs giving the misty perimeter
		//  specks       53%  — tiny sprayed dots populating the whole field
		const chunkEnd = Math.floor(n * 0.1)
		const streakEnd = Math.floor(n * 0.35)
		const haloEnd = Math.floor(n * 0.47)

		const tint = this.cfg.spiceColor
		const baseColor = new THREE.Color(tint[0] ?? 1, tint[1] ?? 0.2, tint[2] ?? 0)
		const baseHSL = { h: 0, s: 0, l: 0 }
		baseColor.getHSL(baseHSL)

		const variance = THREE.MathUtils.clamp(this.cfg.particleColorVariance, 0, 1)

		const spreadAngle = THREE.MathUtils.degToRad(this.cfg.particleSpreadAngleDeg)
		const baseZ = this.cfg.particleForwardDirection >= 0 ? 1 : -1
		const upBoost = this.cfg.particleUpwardBoost
		const fwdVel = this.cfg.particleForwardVelocity
		const chunkSpd = this.cfg.chunkSpeed
		const cloudSpd = this.cfg.cloudSpeed
		const dustSpd = this.cfg.dustSpeed
		const lifeMul = Math.max(0.01, this.cfg.particleLifeMultiplier)
		const sizeMul = Math.max(0.01, this.cfg.particleSizeMultiplier)

		for (let i = 0; i < n; i++) {
			const p = this.particleBodies[i]

			if (i < chunkEnd) p.type = 0
			else if (i < streakEnd) p.type = 1
			else if (i < haloEnd) p.type = 2
			else p.type = 3

			// Tight cluster spawn — reads as a single explosion point.
			p.pos.set(
				origin.x + (Math.random() - 0.5) * 0.12,
				origin.y + (Math.random() - 0.5) * 0.12,
				origin.z + (Math.random() - 0.5) * 0.12
			)

			// Sample a forward cone in 3D so streaks form a radial starburst.
			const phi = Math.random() * Math.PI * 2
			const cosMin = Math.cos(spreadAngle)
			const cosTheta = cosMin + (1 - cosMin) * Math.random()
			const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta))
			const dirX = sinTheta * Math.cos(phi)
			const dirYCone = sinTheta * Math.sin(phi)
			const dirZ = cosTheta * baseZ

			const hueShift = (Math.random() - 0.5) * 0.17 * variance
			const satShift = (Math.random() - 0.5) * 0.5 * variance
			const lightJitter = 0.7 + Math.random() * 0.6

			switch (p.type) {
				case 0: {
					// HERO CHUNKS
					const speed = chunkSpd * (0.4 + Math.random() * 0.7)
					p.vel.set(
						dirX * speed + (Math.random() - 0.5) * 0.5,
						upBoost * (0.5 + Math.random() * 0.7) + dirYCone * speed * 0.5,
						dirZ * speed
					)
					p.maxLife = (1.6 + Math.random() * 1.8) * lifeMul
					p.size = (0.28 + Math.random() * 0.55) * sizeMul
					p.sprite.material.blending = THREE.NormalBlending

					const h = (baseHSL.h + hueShift * 0.6 + 1) % 1
					const s = THREE.MathUtils.clamp(baseHSL.s + satShift * 0.4, 0.7, 1.0)
					const l = THREE.MathUtils.clamp(baseHSL.l * (0.7 + Math.random() * 0.4), 0.18, 0.5)
					p.color.setHSL(h, s, l)
					break
				}
				case 1: {
					// STREAKS
					const speed = fwdVel * (0.95 + Math.random() * 1.1)
					p.vel.set(
						dirX * speed,
						upBoost * (0.3 + Math.random() * 0.7) + dirYCone * speed * 0.7,
						dirZ * speed
					)
					p.maxLife = (1.4 + Math.random() * 1.6) * lifeMul
					p.size = (0.12 + Math.random() * 0.32) * sizeMul
					p.sprite.material.blending = THREE.NormalBlending

					const h = (baseHSL.h + hueShift * 0.9 + 1) % 1
					const s = THREE.MathUtils.clamp(baseHSL.s + satShift * 0.7, 0.6, 1.0)
					const l = THREE.MathUtils.clamp(baseHSL.l * lightJitter, 0.22, 0.7)
					p.color.setHSL(h, s, l)
					break
				}
				case 2: {
					// HALO
					const speed = cloudSpd * (0.3 + Math.random() * 0.8)
					p.vel.set(
						dirX * speed * 0.5 + (Math.random() - 0.5) * 0.4,
						upBoost * 0.2 + Math.random() * 0.5,
						dirZ * speed * 0.7
					)
					p.maxLife = (3.0 + Math.random() * 3.5) * lifeMul
					p.size = (0.55 + Math.random() * 0.85) * sizeMul
					p.sprite.material.blending = THREE.NormalBlending

					const h = (baseHSL.h + hueShift * 1.2 + 1) % 1
					const s = THREE.MathUtils.clamp(baseHSL.s + satShift * 0.6 - 0.1, 0.4, 0.9)
					const l = THREE.MathUtils.clamp(baseHSL.l * 0.45 * lightJitter, 0.08, 0.32)
					p.color.setHSL(h, s, l)
					break
				}
				case 3: {
					// SPECKS
					const speedRoll = Math.random()
					const speed =
						speedRoll < 0.3
							? dustSpd * (0.2 + Math.random() * 0.5)
							: speedRoll < 0.85
								? dustSpd * (0.7 + Math.random() * 1.2)
								: fwdVel * (0.6 + Math.random() * 0.7)
					p.vel.set(
						dirX * speed + (Math.random() - 0.5) * 1.2,
						upBoost * (0.2 + Math.random() * 0.9) + dirYCone * speed * 0.5,
						dirZ * speed + (Math.random() - 0.5) * 0.6
					)
					p.maxLife = (1.6 + Math.random() * 2.6) * lifeMul
					p.size = (0.04 + Math.random() * 0.18) * sizeMul
					p.sprite.material.blending = THREE.NormalBlending

					const h = (baseHSL.h + hueShift * 1.5 + 1) % 1
					const s = THREE.MathUtils.clamp(baseHSL.s + satShift, 0.4, 1.0)
					const l = THREE.MathUtils.clamp(baseHSL.l * (0.5 + Math.random() * 0.7), 0.12, 0.7)
					p.color.setHSL(h, s, l)
					break
				}
			}

			p.life = p.maxLife
			p.sprite.material.color.copy(p.color)
			p.sprite.position.copy(p.pos)
			p.sprite.scale.setScalar(p.size)
			p.sprite.material.opacity = 0
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Per-frame update
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Global playback speed of the whole effect (entrance, wall drop, burst
	 * physics, particles). 1 = the Mattercraft-tuned timing; >1 = faster. Applied
	 * after the per-frame clamp so low frame rates don't slow it down further.
	 */
	timeScale = 1

	/** Advances the effect by `dt` seconds. Call once per rendered frame. */
	update(dt: number) {
		if (!this.loaded) return

		const delta = Math.min(dt, 0.05) * this.timeScale

		switch (this._phase) {
			case 'entrance':
				this.updateEntrance(delta)
				break
			case 'idle':
				this.updateIdle(delta)
				break
			case 'burst':
				this.updateBurst(delta)
				break
		}

		this.updateParticles(delta)
		this.updateEntranceDust(delta)
	}

	private updateEntrance(dt: number) {
		this.entranceTime += dt

		// Castle: hard-snap to full scale once its appear delay has elapsed,
		// then slide forward in Z from castleEntranceStartZ to 0 over
		// castleEntranceDuration. The forward push + dust burst gives the
		// "breaking out of the wall" weight.
		if (this.castleModel) {
			const appearTime = this.cfg.castleAppearDelay
			const appeared = this.entranceTime >= appearTime

			this.castleModel.scale.setScalar(appeared ? this.castleTargetScale : 0.001)

			if (appeared) {
				const emergeT = this.entranceTime - appearTime
				const emergeDur = Math.max(0.001, this.cfg.castleEntranceDuration)
				const t = Math.min(1, emergeT / emergeDur)
				// Ease-out quart: fast push then settle into final Z.
				const eased = 1 - Math.pow(1 - t, 4)
				this.castleEntranceZOffset = this.cfg.castleEntranceStartZ * (1 - eased)

				// Rumble shake — multi-frequency sin layered for that "thud
				// thud" stone-breaking feel. Amplitude decays linearly.
				const ampMax = this.cfg.castleEmergeShakeAmplitude
				const freq = this.cfg.castleEmergeShakeFrequency
				const vbias = THREE.MathUtils.clamp(this.cfg.castleEmergeShakeVerticalBias, 0, 1)
				const ampNow = ampMax * Math.max(0, 1 - t)

				if (ampNow > 0) {
					const tt = emergeT * freq
					const lateralAmp = ampNow * (1 - vbias) * 1.6
					const verticalAmp = ampNow * vbias * 1.6
					const sx = Math.sin(tt * 1.7 + 0.3) * 0.7 + Math.sin(tt * 4.3 + 1.9) * 0.3
					const sy = Math.sin(tt * 1.0 + 1.5) * 0.75 + Math.sin(tt * 3.1 + 0.4) * 0.25
					const sz = Math.sin(tt * 0.9 + 1.1) * 0.6 + Math.sin(tt * 2.7 + 2.4) * 0.4
					this.castleEmergeShake.set(sx * lateralAmp, sy * verticalAmp, sz * lateralAmp * 0.5)
				} else {
					this.castleEmergeShake.set(0, 0, 0)
				}

				this.applyCastleTransform()
			} else {
				this.castleEntranceZOffset = this.cfg.castleEntranceStartZ
				this.castleEmergeShake.set(0, 0, 0)
				this.applyCastleTransform()
			}
		}

		// Dust burst — triggered once when entranceTime crosses entranceDustDelay.
		if (!this.entranceDustTriggered && this.entranceTime >= this.cfg.entranceDustDelay) {
			this.entranceDustTriggered = true
			this.triggerEntranceDust()
		}

		// Walls: each box drops from above its target under gravity. Inner
		// columns drop first; outer columns follow on a per-column stagger.
		const wallStart = this.cfg.wallSpreadDelay
		const dropDuration = Math.max(0.01, this.cfg.wallDropDuration)
		const minDropHeight = this.cfg.wallDropHeight
		const heightPerCol = this.cfg.wallDropHeightPerColumn
		const castleTopY = this.cfg.groundY + this.cfg.castleHeight
		const stagger = Math.max(0, this.cfg.wallStaggerPerColumn)

		if (this.wallCount > 0) {
			for (let i = 0; i < this.wallCount; i++) {
				const target = this.wallTargets[i]
				const localT = this.entranceTime - wallStart - target.col * stagger

				if (localT < 0) {
					for (const mesh of this.wallMeshes) {
						mesh.setMatrixAt(i, this.hiddenMatrix)
					}
					continue
				}

				const castleAnchored = Math.max(0, castleTopY - target.pos.y) + target.col * heightPerCol
				const dropHeight = Math.max(minDropHeight, castleAnchored)

				// Free-fall easing: y_offset = dropHeight * (1 - t²).
				const fallT = Math.min(1, localT / dropDuration)
				const fallEased = fallT * fallT
				const yOffset = (1 - fallEased) * dropHeight

				this._p.copy(target.pos)
				this._p.y += yOffset

				this._q.copy(this.wallRotQuat)
				this._s.setScalar(this.wallBoxScale)
				this._m.compose(this._p, this._q, this._s)
				this._m.premultiply(this.layoutMatrix)

				this.setInstance(this.wallMeshes, i, this._m)
			}
			this.markDirty(this.wallMeshes)
		}

		// Entrance done when BOTH the wall drop and the castle emerge motion
		// have completed.
		const maxColDelay = (this.cfg.wallPerSide - 1) * stagger
		const wallEnd = wallStart + maxColDelay + dropDuration
		const castleEnd = this.cfg.castleAppearDelay + this.cfg.castleEntranceDuration
		const totalDur = Math.max(wallEnd, castleEnd) + 0.3

		if (this.entranceTime > totalDur) {
			this.castleEntranceZOffset = 0
			this.castleEmergeShake.set(0, 0, 0)
			this.applyCastleTransform()

			this.setPhase('idle')

			if (this.cfg.autoFire) {
				this.autoFireTimer = window.setTimeout(() => {
					this.autoFireTimer = undefined
					this.triggerBurst()
				}, 300)
			}
		}
	}

	private updateIdle(_dt: number) {
		if (!this.castleModel) return

		const t = performance.now() * 0.001
		const breath = 1 + Math.sin(t * 1.2) * 0.004
		this.castleModel.scale.setScalar(this.castleTargetScale * breath)
	}

	private updateBurst(dt: number) {
		this.burstTime += dt

		if (this.castleModel) {
			if (this.burstTime < 0.35) {
				const pulse = 1 + Math.sin((this.burstTime / 0.35) * Math.PI) * 0.12
				this.castleModel.scale.setScalar(this.castleTargetScale * pulse)
			} else {
				this.castleModel.scale.setScalar(this.castleTargetScale)
			}
		}

		if (!this.burstActive) return

		const gravity = this.cfg.gravity
		const bounce = this.cfg.bounceDamping
		const friction = this.cfg.friction

		let allSettled = true

		for (const grp of this.burstGroups) {
			for (let i = 0; i < grp.count; i++) {
				const b = grp.bodies[i]
				if (!b) continue

				if (!b.grounded) {
					allSettled = false

					b.vel.y += gravity * dt
					b.pos.x += b.vel.x * dt
					b.pos.y += b.vel.y * dt
					b.pos.z += b.vel.z * dt

					b.rot.x += b.angVel.x * dt
					b.rot.y += b.angVel.y * dt
					b.rot.z += b.angVel.z * dt

					// Small lift proportional to body scale so boxes settle a
					// touch above the floor instead of intersecting it.
					const groundH = this.cfg.burstFloorY + 0.3 * b.scale

					if (b.pos.y < groundH) {
						b.pos.y = groundH
						b.vel.y = -b.vel.y * bounce
						b.vel.x *= friction
						b.vel.z *= friction
						b.angVel.multiplyScalar(0.6)

						if (Math.abs(b.vel.y) < 0.4) {
							b.grounded = true
							b.vel.set(0, 0, 0)
							b.angVel.set(0, 0, 0)
						}
					}
				}

				this._q.setFromEuler(b.rot)
				this._s.setScalar(b.scale)
				this._m.compose(b.pos, this._q, this._s)

				this.setInstanceForGroup(grp, i, this._m)
			}
			this.markDirtyForGroup(grp)
		}

		if (allSettled && this.burstTime > 3) {
			this.burstActive = false
			this.setPhase('idle')
		}
	}

	private updateParticles(dt: number) {
		if (!this.particlesActive || !this.particleGroup) return

		const gravity = this.cfg.gravity
		const partGrav = this.cfg.particleGravity

		let anyAlive = false

		for (let i = 0; i < this.cfg.particleCount; i++) {
			const p = this.particleBodies[i]
			p.life -= dt

			if (p.life <= 0) {
				p.life = 0
				p.sprite.scale.setScalar(0.001)
				p.sprite.material.opacity = 0
				continue
			}

			anyAlive = true

			const ratio = p.life / p.maxLife
			const elapsed = p.maxLife - p.life
			let alpha = 0
			let scale = p.size

			switch (p.type) {
				case 0: {
					const gravRamp0 = Math.min(1, elapsed * 1.2)
					p.vel.y += gravity * partGrav * 1.8 * gravRamp0 * dt
					p.vel.multiplyScalar(1 - 0.8 * dt)
					const fadeIn0 = Math.min(1, elapsed * 3.5)
					alpha = fadeIn0 * Math.pow(ratio, 0.9) * 0.7
					scale = p.size * (0.55 + ratio * 0.55)
					break
				}
				case 1: {
					const gravRamp = Math.min(1, elapsed * 1.8)
					p.vel.y += gravity * partGrav * 0.7 * gravRamp * dt
					p.vel.multiplyScalar(1 - 0.45 * dt)
					const fadeIn = Math.min(1, elapsed * 4)
					alpha = fadeIn * Math.pow(ratio, 1.1) * 0.78
					scale = p.size * (0.4 + ratio * 0.6)
					break
				}
				case 2: {
					p.vel.y += gravity * 0.015 * dt
					p.vel.multiplyScalar(1 - 2.2 * dt)
					p.vel.x += (Math.random() - 0.5) * 0.4 * dt
					p.vel.z += (Math.random() - 0.5) * 0.4 * dt
					const fadeIn2 = Math.min(1, elapsed * 2.5)
					alpha = fadeIn2 * Math.pow(ratio, 0.35) * 0.28
					const growPhase = Math.min(1, elapsed * 1.5)
					scale = p.size * (0.5 + growPhase * 0.7) * (0.85 + ratio * 0.15)
					break
				}
				case 3: {
					p.vel.y += gravity * 0.22 * dt
					p.vel.multiplyScalar(1 - 0.55 * dt)
					const fadeIn3 = Math.min(1, elapsed * 5)
					alpha = fadeIn3 * Math.pow(ratio, 0.75) * 0.7
					scale = p.size * (0.6 + ratio * 0.4)
					break
				}
			}

			p.pos.addScaledVector(p.vel, dt)

			const floorY = this.cfg.burstFloorY
			if (p.pos.y < floorY) {
				p.pos.y = floorY

				if ((p.type === 0 || p.type === 1) && Math.abs(p.vel.y) > 0.5) {
					p.vel.y = -p.vel.y * (p.type === 0 ? 0.25 : 0.18)
					p.vel.x *= 0.6
					p.vel.z *= 0.6
				} else {
					p.vel.y = 0
					p.vel.x *= 0.82
					p.vel.z *= 0.82
				}
			}

			p.sprite.position.copy(p.pos)
			p.sprite.scale.setScalar(scale)
			p.sprite.material.opacity = alpha
		}

		if (!anyAlive) {
			this.particlesActive = false
			this.particleGroup.visible = false
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Instance helpers
	// ─────────────────────────────────────────────────────────────────────────

	private setInstance(meshes: THREE.InstancedMesh[], idx: number, worldMatrix: THREE.Matrix4) {
		for (const mesh of meshes) {
			const local = mesh.userData.localMatrix as THREE.Matrix4
			this._m2.multiplyMatrices(worldMatrix, local)
			mesh.setMatrixAt(idx, this._m2)
		}
	}

	private setInstanceForGroup(grp: BurstGroup, idx: number, worldMatrix: THREE.Matrix4) {
		for (const part of grp.model.parts) {
			this._m2.multiplyMatrices(worldMatrix, part.localMatrix)
			part.mesh.setMatrixAt(idx, this._m2)
		}
	}

	private markDirty(meshes: THREE.InstancedMesh[]) {
		for (const mesh of meshes) {
			mesh.instanceMatrix.needsUpdate = true
		}
	}

	private markDirtyForGroup(grp: BurstGroup) {
		for (const part of grp.model.parts) {
			part.mesh.instanceMatrix.needsUpdate = true
		}
	}

	private cloneMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
		if (Array.isArray(material)) {
			return material.map((m) => m.clone())
		}
		return material.clone()
	}

	private disposeMaterial(material: THREE.Material | THREE.Material[]) {
		if (Array.isArray(material)) {
			for (const m of material) m.dispose()
		} else {
			material.dispose()
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Teardown
	// ─────────────────────────────────────────────────────────────────────────

	dispose() {
		this.disposed = true

		if (this.autoFireTimer !== undefined) {
			window.clearTimeout(this.autoFireTimer)
			this.autoFireTimer = undefined
		}

		for (const mesh of this.wallMeshes) {
			this.root.remove(mesh)
			mesh.geometry.dispose()
			this.disposeMaterial(mesh.material as THREE.Material | THREE.Material[])
		}
		this.wallMeshes = []

		for (const grp of this.burstGroups) {
			for (const part of grp.model.parts) {
				this.root.remove(part.mesh)
				part.mesh.geometry.dispose()
				this.disposeMaterial(part.mesh.material as THREE.Material | THREE.Material[])
			}
		}
		this.burstGroups = []

		if (this.particleGroup) {
			for (const body of this.particleBodies) {
				body.sprite.material.dispose()
			}
			this.root.remove(this.particleGroup)
		}
		this.particleBodies = []

		if (this.entranceDustGroup) {
			for (const body of this.entranceDustBodies) {
				body.sprite.material.dispose()
			}
			this.root.remove(this.entranceDustGroup)
		}
		this.entranceDustBodies = []

		if (this.powderTexture) this.powderTexture.dispose()

		// The rock is a child of the castle, so one traversal disposes both.
		if (this.castleModel) {
			this.castleModel.traverse((obj) => {
				const mesh = obj as THREE.Mesh
				if (mesh.isMesh) {
					mesh.geometry.dispose()
					this.disposeMaterial(mesh.material)
				}
			})
			this.root.remove(this.castleModel)
		}
		this.rockModel?.removeFromParent()

		if (this.burstFloorMesh) this.root.remove(this.burstFloorMesh)
		this.burstFloorGeometry?.dispose()
		this.burstFloorMaterial?.dispose()

		if (this.shadowFloorMesh) this.root.remove(this.shadowFloorMesh)
		this.shadowFloorGeometry?.dispose()
		this.shadowFloorMaterial?.dispose()

		this.root.removeFromParent()
	}
}
