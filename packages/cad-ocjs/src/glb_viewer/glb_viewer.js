// glb_viewer.js
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { initViewCube, updateViewCube } from '../viewCube'

/**
 * 3D 뷰어 초기화 및 씬 설정
 * @returns {Object} Three.js 컨텍스트 객체
 */
const setupThreeJSViewport = () => {
  // 씬 생성 및 초기화
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeeeeee)

  // 카메라 설정
  const viewport = document.getElementById('viewport')
  const camera = new THREE.PerspectiveCamera(
    75,
    viewport.clientWidth / viewport.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 5)

  // 렌더러 설정
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(viewport.clientWidth, viewport.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.outputEncoding = THREE.sRGBEncoding
  viewport.appendChild(renderer.domElement)

  // 조명 설정
  const ambientLight = new THREE.AmbientLight(0x404040, 2)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight2.position.set(-1, -1, -1)
  scene.add(directionalLight2)

  // 컨트롤 설정
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.screenSpacePanning = true
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0, 0)
  controls.update()

  // 창 크기 조절 처리
  window.addEventListener('resize', () => {
    const vp = document.getElementById('viewport')
    if (!vp) return

    const width = vp.clientWidth
    const height = vp.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
  })

  // 애니메이션 루프
  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
    updateViewCube()
  }
  animate()

  return { scene, camera, controls, renderer }
}

/**
 * GLB 모델 로드 함수
 * @param {Object} context - Three.js 컨텍스트 객체
 * @param {string} url - GLB 파일 경로
 * @returns {Promise} 로딩 완료 Promise
 */
const loadGLBModel = (context, url) => {
  const { scene } = context
  const infoElement = document.getElementById('info')
  infoElement.textContent = '모델 로딩 중...'

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()

    loader.load(
      url,
      gltf => {
        // 기존 모델 제거
        const existingModel = scene.getObjectByName('model')
        if (existingModel) {
          scene.remove(existingModel)
        }

        // 모델 추가
        const model = gltf.scene
        model.name = 'model'
        scene.add(model)

        // 모델 정보 표시
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        infoElement.textContent = `모델 로드 완료: 크기 (${size.x.toFixed(
          2
        )} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)})`

        resolve(model)
      },
      xhr => {
        const progress = (xhr.loaded / xhr.total) * 100
        infoElement.textContent = `로딩 중: ${progress.toFixed(0)}%`
      },
      error => {
        infoElement.textContent = `모델 로드 오류: ${error.message}`
        console.error('GLB 모델 로드 오류:', error)
        reject(error)
      }
    )
  })
}

/**
 * 카메라를 모델에 맞게 조정하는 함수
 * @param {Object} context - Three.js 컨텍스트 객체
 */
const focusCameraOnModel = context => {
  const { scene, camera, controls } = context
  const model = scene.getObjectByName('model')

  if (model && controls) {
    // 모델의 경계 상자 계산
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // 카메라 타겟을 모델 중심으로 설정
    controls.target.copy(center)

    // 모델 크기에 맞게 카메라 위치 조정
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    cameraZ *= 1.5 // 여유 공간 확보

    // 카메라 방향을 유지하며 위치 조정
    const direction = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize()

    // 새 타겟에서 계산된 거리만큼 떨어진 곳으로 카메라 이동
    if (direction.lengthSq() === 0) {
      camera.position.copy(center)
      camera.position.z += cameraZ // 기본 Z축 방향
    } else {
      camera.position.copy(center).addScaledVector(direction, cameraZ)
    }

    // 컨트롤 업데이트
    controls.update()
  }
}

// 초기화 및 이벤트 설정
document.addEventListener('DOMContentLoaded', () => {
  // Three.js 초기화
  const context = setupThreeJSViewport()
  const { camera, renderer } = context

  // 뷰큐브 초기화
  initViewCube(camera, renderer)

  // 버튼 이벤트 설정
  document.getElementById('load-model').addEventListener('click', async () => {
    try {
      // 공용 디렉토리에서 GLB 파일 로드
      const model = await loadGLBModel(context, '/AntiqueCamera.glb')
      focusCameraOnModel(context)
    } catch (error) {
      console.error('모델 로드 실패:', error)
    }
  })

  document.getElementById('reset-view').addEventListener('click', () => {
    focusCameraOnModel(context)
  })

  // 자동으로 모델 로드 (선택적)
  loadGLBModel(context, '/AntiqueCamera.glb')
    .then(() => {
      focusCameraOnModel(context)
    })
    .catch(error => {
      console.error('초기 모델 로드 실패:', error)
    })
})
