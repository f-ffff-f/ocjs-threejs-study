// render_threejs/viewCube.js
import * as THREE from 'three'

let cubeScene, cubeCamera, cubeRenderer
let viewCubeMesh
let mainCameraRef // 메인 카메라 참조

const CUBE_SIZE = 1 // 내부 큐브 크기
const MARGIN = 10 // 뷰포트에서의 여백 (px)
const CUBE_DIV_SIZE = 100 // 뷰큐브 div 크기 (px) - CSS와 일치

export function initViewCube(mainCamera, mainRenderer) {
  mainCameraRef = mainCamera // 메인 카메라 참조 저장

  const container = document.getElementById('viewcube-container')
  if (!container) {
    console.error('ViewCube container not found!')
    return
  }

  // 1. 뷰큐브용 렌더러 설정
  cubeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) // alpha:true 배경 투명
  cubeRenderer.setSize(CUBE_DIV_SIZE, CUBE_DIV_SIZE)
  cubeRenderer.setPixelRatio(window.devicePixelRatio)
  container.appendChild(cubeRenderer.domElement)

  // 2. 뷰큐브용 Scene 설정
  cubeScene = new THREE.Scene()

  // 3. 뷰큐브용 카메라 설정 (Orthographic)
  const aspect = 1 // 정사각형
  const frustumSize = CUBE_SIZE * 1.5 // 큐브가 카메라에 꽉 차도록 크기 조절
  cubeCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  )
  cubeCamera.position.z = 5 // 카메라 위치

  // 4. 뷰큐브 메쉬 생성 (텍스트 포함)
  const loader = new THREE.TextureLoader()
  const faceTextures = [
    createFaceTexture('+X', 'rgb(255, 100, 100)'), // Right (+X)
    createFaceTexture('-X', 'rgb(255, 150, 150)'), // Left (-X)
    createFaceTexture('+Y', 'rgb(100, 255, 100)'), // Top (+Y)
    createFaceTexture('-Y', 'rgb(150, 255, 150)'), // Bottom (-Y)
    createFaceTexture('+Z', 'rgb(100, 100, 255)'), // Front (+Z)
    createFaceTexture('-Z', 'rgb(150, 150, 255)'), // Back (-Z)
  ]

  const materials = faceTextures.map(
    texture =>
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
  )
  const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
  viewCubeMesh = new THREE.Mesh(geometry, materials)
  cubeScene.add(viewCubeMesh)

  // 5. (선택) 뷰큐브 주변에 축 표시기 추가 (선)
  const axesHelper = new THREE.AxesHelper(CUBE_SIZE * 0.8)
  cubeScene.add(axesHelper)
}

// 각 면에 텍스트를 그리는 함수
function createFaceTexture(text, bgColor) {
  const canvas = document.createElement('canvas')
  const size = 128 // 텍스처 해상도
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  // 배경색
  context.fillStyle = bgColor
  context.fillRect(0, 0, size, size)

  // 텍스트
  context.font = `Bold ${size * 0.4}px Arial` // 텍스트 크기
  context.fillStyle = 'white'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, size / 2, size / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// 뷰큐브 업데이트 함수 (애니메이션 루프에서 호출됨)
export function updateViewCube() {
  if (!cubeRenderer || !mainCameraRef) return

  // 메인 카메라의 방향(quaternion)을 가져옵니다.
  const mainCameraQuaternion = mainCameraRef.quaternion

  // 뷰큐브 메쉬가 메인 카메라와 반대로 회전하도록 설정
  // (카메라가 오른쪽으로 돌면 큐브의 +X 면이 보이도록)
  const invQuaternion = mainCameraQuaternion.clone().invert()
  viewCubeMesh.quaternion.copy(invQuaternion)
  // 또는 뷰큐브 카메라를 회전시킬 수도 있습니다.
  // cubeCamera.quaternion.copy(mainCameraQuaternion);

  // 뷰큐브 렌더링
  cubeRenderer.render(cubeScene, cubeCamera)
}
