// glb_viewer.js
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { initViewCube, updateViewCube } from '../viewCube'

// 전역 상태 관리
const STATE = {
  isControlsEnabled: true, // 카메라 컨트롤 활성화 상태
  isSelectionMode: false, // 선택 모드 상태
  selectedParts: [], // 선택된 부품 배열 (다중 선택 지원)
}

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

        // 모든 메시에 고유 이름 부여 및 선택 가능하도록 설정
        let partIndex = 0
        model.traverse(child => {
          if (child.isMesh) {
            ++partIndex

            // 메시가 선택 가능하도록 설정
            child.userData.selectable = true

            // 원본 재질 저장 (선택 시 하이라이트를 위해)
            child.userData.originalMaterial = child.material.clone()

            // 부품 정보 추가
            child.userData.partInfo = {
              id: partIndex,
              name: child.name,
              vertexCount: child.geometry.attributes.position.count,
              triangleCount: child.geometry.index
                ? child.geometry.index.count / 3
                : 0,
            }
          }
        })

        scene.add(model)

        // 모델 정보 표시
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        infoElement.innerHTML = `
          <div>
            <p><strong>모델 로드 완료</strong></p>
            <p>크기: ${size.x.toFixed(2)} × ${size.y.toFixed(
          2
        )} × ${size.z.toFixed(2)}</p>
            <p>중심점: (${center.x.toFixed(2)}, ${center.y.toFixed(
          2
        )}, ${center.z.toFixed(2)})</p>
            <p>부품 수: ${partIndex}개</p>
          </div>
        `

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

/**
 * 선택된 부품에 초점을 맞추는 함수
 * @param {Object} context - Three.js 컨텍스트 객체
 * @param {THREE.Object3D} object - 선택된 부품
 */
const focusOnPart = (context, object) => {
  if (!object) return

  const { camera, controls } = context

  // 부품의 경계 상자 계산
  const box = new THREE.Box3().setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  // 카메라 타겟을 부품 중심으로 설정
  controls.target.copy(center)

  // 부품 크기에 맞게 카메라 위치 조정
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  cameraZ *= 3 // 여유 공간 확보

  // 카메라 방향 유지하며 위치 조정
  const direction = new THREE.Vector3()
    .subVectors(camera.position, controls.target)
    .normalize()

  if (direction.lengthSq() === 0) {
    camera.position.copy(center)
    camera.position.z += cameraZ
  } else {
    camera.position.copy(center).addScaledVector(direction, cameraZ)
  }

  // 컨트롤 업데이트
  controls.update()
}

/**
 * 파트 선택을 위한 레이캐스팅 설정
 * @param {Object} context - Three.js 컨텍스트 객체
 */
const setupPartSelection = context => {
  const { scene, camera, renderer, controls } = context
  const viewport = renderer.domElement
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  // 현재 선택된 객체와 마우스 오버된 객체 추적
  let selectedObject = null
  let hoveredObject = null

  // 모드 토글 버튼 설정
  const toggleModeButton = document.getElementById('toggle-mode')
  if (toggleModeButton) {
    toggleModeButton.addEventListener('click', () => {
      STATE.isSelectionMode = !STATE.isSelectionMode
      controls.enabled = !STATE.isSelectionMode

      toggleModeButton.textContent = STATE.isSelectionMode
        ? '모드: 부품 선택'
        : '모드: 카메라 이동'

      // 모드에 따라 버튼 스타일 변경
      if (STATE.isSelectionMode) {
        toggleModeButton.classList.add('active')
        viewport.style.cursor = 'crosshair'
      } else {
        toggleModeButton.classList.remove('active')
        viewport.style.cursor = 'grab'

        // 모드 변경 시 호버링 초기화
        resetHover()
      }
    })
  }

  // 하이라이트 재질 생성
  const createHighlightMaterial = (originalMaterial, isSelected) => {
    const material = originalMaterial.clone()

    // 선택된 경우는 파란색, 호버링인 경우는 노란색으로 표시
    const color = isSelected
      ? new THREE.Color(0x2196f3)
      : new THREE.Color(0xffeb3b)

    // 재질 타입에 따라 다르게 처리
    if (material.color) {
      material.color.set(color)
    }

    // 재질 투명도 설정
    if (material.opacity !== undefined) {
      material.opacity = 0.8
      material.transparent = true
    }

    material.emissive = new THREE.Color(isSelected ? 0x0d47a1 : 0xffc107)
    material.emissiveIntensity = 0.5

    return material
  }

  // 선택 상태 초기화 함수
  const resetSelection = () => {
    // 이전에 선택된 객체 초기화
    if (selectedObject) {
      selectedObject.material = selectedObject.userData.originalMaterial.clone()
      selectedObject = null
      STATE.selectedParts = []
    }
  }

  // 호버링 상태 초기화 함수
  const resetHover = () => {
    if (hoveredObject && hoveredObject !== selectedObject) {
      hoveredObject.material = hoveredObject.userData.originalMaterial.clone()
      hoveredObject = null
    }
  }

  // 모델의 부품 정보 업데이트
  const updatePartsList = () => {
    const model = scene.getObjectByName('model')
    const partsListElement = document.getElementById('parts-list')

    if (!partsListElement || !model) return

    // 부품 목록 초기화
    partsListElement.innerHTML = ''

    // 부품 목록 생성
    const meshes = []
    model.traverse(child => {
      if (child.isMesh && child.userData.selectable) {
        meshes.push(child)
      }
    })

    // 부품이 없는 경우
    if (meshes.length === 0) {
      const listItem = document.createElement('li')
      listItem.textContent = '선택 가능한 부품이 없습니다.'
      partsListElement.appendChild(listItem)
      return
    }

    // 부품 목록 표시 (이름순 정렬)
    meshes
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(mesh => {
        const listItem = document.createElement('li')
        listItem.textContent = `${mesh.name} (${mesh.uuid})`
        listItem.title = `정점: ${
          mesh.userData.partInfo?.vertexCount ?? 0
        }, 삼각형: ${mesh.userData.partInfo?.triangleCount ?? 0}`
        listItem.style.cursor = 'pointer'

        // 부품 클릭 시 선택
        listItem.addEventListener('click', () => {
          resetSelection()
          selectedObject = mesh
          mesh.material = createHighlightMaterial(
            mesh.userData.originalMaterial,
            true
          )
          // 선택된 부품에 카메라 포커스
          focusOnPart(context, mesh)

          // 선택된 항목 스타일 변경
          const items = partsListElement.querySelectorAll('li')
          items.forEach(item => item.classList.remove('selected'))
          listItem.classList.add('selected')

          // 선택된 부품 배열에 추가
          STATE.selectedParts = [mesh]
        })

        partsListElement.appendChild(listItem)
      })
  }

  // 마우스 이동 이벤트 처리
  viewport.addEventListener('mousemove', event => {
    // 선택 모드일 때만 레이캐스팅 활성화
    if (STATE.isSelectionMode) {
      // 마우스 좌표 계산 (정규화된 장치 좌표)
      const rect = viewport.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1

      // 레이캐스터 업데이트
      raycaster.setFromCamera(mouse, camera)

      // 모델과의 교차점 계산
      const model = scene.getObjectByName('model')
      if (!model) return

      const intersects = raycaster.intersectObjects(model.children, true)

      // 이전 호버링 상태 초기화
      resetHover()

      // 선택 가능한 객체와 교차한 경우 호버링 효과 적용
      if (intersects.length > 0) {
        const object = intersects[0].object

        if (object && object.userData && object.userData.selectable) {
          // 이미 선택된 객체가 아닌 경우에만 호버링 효과 적용
          if (object !== selectedObject) {
            hoveredObject = object
            object.material = createHighlightMaterial(
              object.userData.originalMaterial,
              false
            )
          }

          // 커서 변경
          viewport.style.cursor = 'pointer'
        }
      } else {
        // 교차점 없는 경우 선택 모드에서는 crosshair 커서 유지
        viewport.style.cursor = 'crosshair'
      }
    }
  })

  // 마우스 클릭 이벤트 처리
  viewport.addEventListener('click', event => {
    // 선택 모드일 때만 레이캐스팅 활성화
    if (STATE.isSelectionMode) {
      // 마우스 좌표 계산 (정규화된 장치 좌표)
      const rect = viewport.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / viewport.clientWidth) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / viewport.clientHeight) * 2 + 1

      // 레이캐스터 업데이트
      raycaster.setFromCamera(mouse, camera)

      // 모델과의 교차점 계산
      const model = scene.getObjectByName('model')
      if (!model) return

      const intersects = raycaster.intersectObjects(model.children, true)

      // 이전 선택 초기화
      resetSelection()

      // 새 객체 선택
      if (intersects.length > 0) {
        const object = intersects[0].object

        if (object && object.userData && object.userData.selectable) {
          selectedObject = object
          object.material = createHighlightMaterial(
            object.userData.originalMaterial,
            true
          )
          // 선택된 부품 배열에 추가
          STATE.selectedParts = [object]

          // 부품 목록에서 해당 항목 강조
          const partsListElement = document.getElementById('parts-list')
          if (partsListElement) {
            const items = partsListElement.querySelectorAll('li')
            items.forEach(item => {
              if (item.textContent === object.name) {
                item.classList.add('selected')

                // 선택된 항목이 보이도록 스크롤
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              } else {
                item.classList.remove('selected')
              }
            })
          }
        }
      }
    }
  })

  // 키보드 이벤트 처리 - Shift 키를 누르면 일시적으로 모드 전환
  document.addEventListener('keydown', event => {
    if (event.key === 'Shift') {
      const wasSelectionMode = STATE.isSelectionMode

      // Shift 키를 누르면 일시적으로 반대 모드로 전환
      STATE.isSelectionMode = !STATE.isSelectionMode
      controls.enabled = !STATE.isSelectionMode

      // 커서 업데이트
      viewport.style.cursor = STATE.isSelectionMode ? 'crosshair' : 'grab'

      // 호버링 초기화
      if (!STATE.isSelectionMode) {
        resetHover()
      }

      // 임시 모드 전환 상태 저장
      viewport.dataset.tempModeChange = wasSelectionMode.toString()
    } else if (event.key === 'f' && selectedObject) {
      // F 키를 누르면 선택된 부품에 포커스
      focusOnPart(context, selectedObject)
    } else if (event.key === 'Escape') {
      // ESC 키를 누르면 선택 초기화
      resetSelection()

      // 부품 목록에서 선택된 항목 초기화
      const partsListElement = document.getElementById('parts-list')
      if (partsListElement) {
        const items = partsListElement.querySelectorAll('li')
        items.forEach(item => item.classList.remove('selected'))
      }
    }
  })

  document.addEventListener('keyup', event => {
    if (event.key === 'Shift' && viewport.dataset.tempModeChange) {
      // Shift 키를 떼면 원래 모드로 복귀
      STATE.isSelectionMode = viewport.dataset.tempModeChange === 'true'
      controls.enabled = !STATE.isSelectionMode

      // 커서 업데이트
      viewport.style.cursor = STATE.isSelectionMode ? 'crosshair' : 'grab'

      // 임시 모드 전환 상태 초기화
      delete viewport.dataset.tempModeChange
    }
  })

  // 선택 초기화 버튼 이벤트 설정
  const clearSelectionButton = document.getElementById('clear-selection')
  if (clearSelectionButton) {
    clearSelectionButton.addEventListener('click', () => {
      resetSelection()

      // 부품 목록에서 선택된 항목 초기화
      const partsListElement = document.getElementById('parts-list')
      if (partsListElement) {
        const items = partsListElement.querySelectorAll('li')
        items.forEach(item => item.classList.remove('selected'))
      }
    })
  }

  // GLB 모델 로드 이벤트를 리스닝하여 부품 목록 업데이트
  document.addEventListener('model-loaded', updatePartsList)

  return {
    resetSelection,
    updatePartsList,
    focusOnPart,
  }
}

// 초기화 및 이벤트 설정
document.addEventListener('DOMContentLoaded', () => {
  // Three.js 초기화
  const context = setupThreeJSViewport()
  const { camera, renderer, controls } = context

  // 뷰큐브 초기화
  initViewCube(camera, renderer)

  // 파트 선택 기능 초기화
  const selectionTools = setupPartSelection(context)

  // 버튼 이벤트 설정
  document.getElementById('load-model').addEventListener('click', async () => {
    try {
      // 공용 디렉토리에서 GLB 파일 로드
      const model = await loadGLBModel(context, 'AntiqueCamera.glb')
      focusCameraOnModel(context)

      // 부품 목록 업데이트
      selectionTools.updatePartsList()

      // 모델 로드 완료 이벤트 발생
      document.dispatchEvent(new Event('model-loaded'))
    } catch (error) {
      console.error('모델 로드 실패:', error)
    }
  })

  document.getElementById('reset-view').addEventListener('click', () => {
    focusCameraOnModel(context)
  })

  // 자동으로 모델 로드 (선택적)
  loadGLBModel(context, 'AntiqueCamera.glb')
    .then(() => {
      focusCameraOnModel(context)

      // 부품 목록 업데이트
      selectionTools.updatePartsList()

      // 모델 로드 완료 이벤트 발생
      document.dispatchEvent(new Event('model-loaded'))
    })
    .catch(error => {
      console.error('초기 모델 로드 실패:', error)
    })
})
