// WallPlacer — the "Vertical Wall AR" placement helpers (see docs/VERTICAL_WALL_AR.md).
//
// Stage 'wall'   : a white line on the floor follows the camera's centre ray
//                  (ray ∩ floor y = 0), always perpendicular to the camera's
//                  horizontal forward. confirmWall() freezes it into a wall pose.
// Stage 'castle' : a gradient wall (white at the bottom → transparent at the top)
//                  stands on that line; a red ring follows ray ∩ wall.
//                  confirmCastle() returns the anchor point on the wall.
// Stage 'play'   : gradient + ring hidden, only the wall's shadow catcher stays.
//
// `wallGroup` is the anchor everything hangs from: +Z faces the user, its
// origin sits on the floor at the wall's base. Add the KfcEffect under it.

import * as THREE from 'three'

export type PlacementStage = 'wall' | 'castle' | 'play'

export interface WallPlacerOptions {
	lineLength?: number
	wallWidth?: number
	wallHeight?: number
	wallShadowOpacity?: number
	ringRadius?: number
	/** Minimum anchor height above the floor accepted by confirmCastle (m). */
	minAnchorHeight?: number
}

const WALL_GRADIENT_VERT = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

const WALL_GRADIENT_FRAG = /* glsl */ `
	varying vec2 vUv;
	uniform float uOpacity;
	void main() {
		// Bright base edge + gradient that fades out towards the top.
		float fade = pow(1.0 - vUv.y, 1.6);
		float edge = smoothstep(0.03, 0.0, vUv.y) * 0.6;
		// Faint horizontal scan lines so the surface reads as a plane.
		float lines = 0.08 * (0.5 + 0.5 * sin(vUv.y * 120.0));
		float alpha = clamp(fade * (0.45 + lines) + edge, 0.0, 1.0) * uOpacity;
		gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
	}
`

export class WallPlacer {
	/** World-space root: holds the floor line and the wall group. */
	readonly root = new THREE.Group()
	/** Placed wall anchor (origin on the floor, +Z toward the user). */
	readonly wallGroup = new THREE.Group()

	stage: PlacementStage = 'wall'
	/** True while the centre ray hits the floor (stage wall) / the wall (stage castle). */
	aimValid = false

	private readonly opts: Required<WallPlacerOptions>

	private lineGroup = new THREE.Group()
	private lineMesh: THREE.Mesh
	private lineGlow: THREE.Mesh

	private wallGradient: THREE.Mesh
	private wallShadow: THREE.Mesh
	private ring: THREE.Group

	private raycaster = new THREE.Raycaster()
	private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

	private lastFloorHit = new THREE.Vector3()
	private lastForward = new THREE.Vector3(0, 0, -1)
	private lastWallHitLocal = new THREE.Vector3()

	private _dir = new THREE.Vector3()
	private _pos = new THREE.Vector3()
	private _hit = new THREE.Vector3()
	private _target = new THREE.Vector3()

	constructor(options: WallPlacerOptions = {}) {
		this.opts = {
			lineLength: options.lineLength ?? 4,
			wallWidth: options.wallWidth ?? 12,
			wallHeight: options.wallHeight ?? 6,
			wallShadowOpacity: options.wallShadowOpacity ?? 0.1,
			ringRadius: options.ringRadius ?? 0.12,
			minAnchorHeight: options.minAnchorHeight ?? 0.25
		}

		this.root.name = 'WallPlacer'
		this.wallGroup.name = 'VirtualWallAnchor'
		this.root.add(this.wallGroup)

		// ── Floor line (stage wall)
		this.lineGroup.name = 'FloorLine'
		const lineGeo = new THREE.PlaneGeometry(this.opts.lineLength, 0.025)
		lineGeo.rotateX(-Math.PI / 2)
		this.lineMesh = new THREE.Mesh(
			lineGeo,
			new THREE.MeshBasicMaterial({
				color: 0xffffff,
				transparent: true,
				opacity: 0.95,
				depthWrite: false,
				side: THREE.DoubleSide
			})
		)
		this.lineMesh.position.y = 0.005
		const glowGeo = new THREE.PlaneGeometry(this.opts.lineLength, 0.16)
		glowGeo.rotateX(-Math.PI / 2)
		this.lineGlow = new THREE.Mesh(
			glowGeo,
			new THREE.MeshBasicMaterial({
				color: 0xffffff,
				transparent: true,
				opacity: 0.22,
				depthWrite: false,
				side: THREE.DoubleSide
			})
		)
		this.lineGlow.position.y = 0.004
		this.lineGroup.add(this.lineGlow, this.lineMesh)
		this.lineGroup.visible = false
		this.root.add(this.lineGroup)

		// ── Wall gradient (stage castle) — front face at wallGroup z = 0.
		const wallGeo = new THREE.PlaneGeometry(this.opts.wallWidth, this.opts.wallHeight)
		this.wallGradient = new THREE.Mesh(
			wallGeo,
			new THREE.ShaderMaterial({
				vertexShader: WALL_GRADIENT_VERT,
				fragmentShader: WALL_GRADIENT_FRAG,
				uniforms: { uOpacity: { value: 1 } },
				transparent: true,
				depthWrite: false,
				side: THREE.DoubleSide
			})
		)
		this.wallGradient.name = 'VirtualWallGradient'
		this.wallGradient.position.set(0, this.opts.wallHeight / 2, 0)
		this.wallGradient.visible = false
		this.wallGroup.add(this.wallGradient)

		// ── Wall shadow catcher — always there once the wall is placed
		//    (the Scene.zcomp ShadowPlane equivalent).
		this.wallShadow = new THREE.Mesh(
			wallGeo,
			new THREE.ShadowMaterial({ opacity: this.opts.wallShadowOpacity, transparent: true })
		)
		this.wallShadow.name = 'VirtualWallShadow'
		this.wallShadow.position.set(0, this.opts.wallHeight / 2, -0.005)
		this.wallShadow.receiveShadow = true
		this.wallShadow.visible = false
		this.wallGroup.add(this.wallShadow)

		// ── Red aim ring (stage castle), lies on the wall plane.
		this.ring = new THREE.Group()
		this.ring.name = 'AimRing'
		const r = this.opts.ringRadius
		const ringMat = new THREE.MeshBasicMaterial({
			color: 0xe1021f,
			transparent: true,
			opacity: 0.95,
			depthWrite: false,
			depthTest: false,
			side: THREE.DoubleSide
		})
		const outer = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 64), ringMat)
		const inner = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r * 0.4, 48), ringMat)
		const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.08, 24), ringMat)
		outer.renderOrder = inner.renderOrder = dot.renderOrder = 999
		this.ring.add(outer, inner, dot)
		this.ring.position.z = 0.01
		this.ring.visible = false
		this.wallGroup.add(this.ring)

		this.wallGroup.visible = false
	}

	// ─────────────────────────────────────────────────────────────────────────

	/** Restarts placement from stage 'wall'. */
	reset() {
		this.stage = 'wall'
		this.aimValid = false
		this.lineGroup.visible = false
		this.wallGroup.visible = false
		this.wallGradient.visible = false
		this.wallShadow.visible = false
		this.ring.visible = false
	}

	/** Call once per frame with the (already updated) AR camera. */
	update(camera: THREE.Camera) {
		camera.getWorldPosition(this._pos)
		camera.getWorldDirection(this._dir)

		if (this.stage === 'wall') {
			this.updateFloorLine()
		} else if (this.stage === 'castle') {
			this.updateAimRing()
		}
	}

	private updateFloorLine() {
		// Ray ∩ floor plane (only when looking downwards).
		if (this._dir.y >= -0.02) {
			this.aimValid = false
			this.lineGroup.visible = false
			return
		}
		const t = -this._pos.y / this._dir.y
		if (!(t > 0.2 && t < 12)) {
			this.aimValid = false
			this.lineGroup.visible = false
			return
		}
		this._hit.copy(this._pos).addScaledVector(this._dir, t)

		// Horizontal forward → line perpendicular to it, +Z of the group facing the user.
		this.lastForward.set(this._dir.x, 0, this._dir.z)
		if (this.lastForward.lengthSq() < 1e-6) this.lastForward.set(0, 0, -1)
		this.lastForward.normalize()

		this.lastFloorHit.copy(this._hit)
		this.lineGroup.position.copy(this._hit)
		this._target.copy(this._hit).sub(this.lastForward)
		this.lineGroup.lookAt(this._target)

		this.lineGroup.visible = true
		this.aimValid = true
	}

	private updateAimRing() {
		this.raycaster.set(this._pos, this._dir)
		this.raycaster.far = 20
		const hits = this.raycaster.intersectObject(this.wallGradient, false)
		if (hits.length === 0) {
			this.aimValid = false
			this.ring.visible = false
			return
		}
		this.wallGroup.worldToLocal(this.lastWallHitLocal.copy(hits[0].point))
		this.ring.position.set(this.lastWallHitLocal.x, this.lastWallHitLocal.y, 0.01)
		this.ring.visible = true
		this.aimValid = this.lastWallHitLocal.y >= this.opts.minAnchorHeight
		// Dim the ring when too low to be a valid anchor.
		this.ring.scale.setScalar(this.aimValid ? 1 : 0.7)
	}

	/** Stage wall → castle. Returns false if the line isn't currently on the floor. */
	confirmWall(): boolean {
		if (this.stage !== 'wall' || !this.aimValid) return false

		this.wallGroup.position.copy(this.lastFloorHit)
		this._target.copy(this.lastFloorHit).sub(this.lastForward)
		this.wallGroup.lookAt(this._target)
		this.wallGroup.updateMatrixWorld(true)

		this.lineGroup.visible = false
		this.wallGroup.visible = true
		this.wallGradient.visible = true
		this.wallShadow.visible = true
		this.ring.visible = false

		this.stage = 'castle'
		this.aimValid = false
		return true
	}

	/**
	 * Stage castle → play. Returns the anchor point in wallGroup local space
	 * (x along the wall, y = height above the floor, z = 0), or null if the
	 * ring isn't on the wall / is too low.
	 */
	confirmCastle(): THREE.Vector3 | null {
		if (this.stage !== 'castle' || !this.aimValid) return null

		const anchor = new THREE.Vector3(this.lastWallHitLocal.x, this.lastWallHitLocal.y, 0)

		this.wallGradient.visible = false
		this.ring.visible = false
		this.wallShadow.visible = true

		this.stage = 'play'
		return anchor
	}

	/** Debug: show the wall plane tinted while playing. */
	setDebug(on: boolean) {
		const mat = this.wallGradient.material as THREE.ShaderMaterial
		mat.uniforms.uOpacity.value = on ? 0.35 : 1
		if (this.stage === 'play') this.wallGradient.visible = on
	}

	dispose() {
		this.root.removeFromParent()
		this.root.traverse((obj) => {
			const mesh = obj as THREE.Mesh
			if (mesh.isMesh) {
				mesh.geometry.dispose()
				const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
				for (const m of mats) m.dispose()
			}
		})
	}
}
