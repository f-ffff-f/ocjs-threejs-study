// render_threejs/script.js
import * as THREE from 'three' // THREE import 추가
import { initOpenCascade } from '../share'
import {
  loadSTEPorIGES,
  setupThreeJSViewport,
  addShapeToScene,
} from './library'
import { initViewCube } from '../viewCube.js'

// setupThreeJSViewport 호출 및 결과 저장
const threeJsContext = setupThreeJSViewport()
if (!threeJsContext) {
  console.error('Failed to initialize Three.js viewport.')
} else {
  const { scene, camera, controls, renderer } = threeJsContext // controls 가져오기

  // 뷰큐브 초기화
  initViewCube(camera, renderer)

  // --- 모델 로드 후 카메라 타겟 및 위치 업데이트 함수 ---
  function focusCameraOnModel() {
    const model = scene.getObjectByName('shape') // 이름으로 모델 찾기
    if (model && controls) {
      // 1. 모델의 Bounding Box 계산
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      // 2. OrbitControls의 target을 모델 중심으로 설정
      controls.target.copy(center)

      // 3. (선택 사항) 카메라 위치 조정하여 모델 전체가 보이도록 함
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
      cameraZ *= 1.5 // 약간의 여유 공간 확보 (값을 조절하여 줌 레벨 변경)

      // 현재 카메라 방향 유지하며 거리 조정 (더 부드러운 전환)
      const direction = new THREE.Vector3()
        .subVectors(camera.position, controls.target) // 이전 타겟 기준 방향
        .normalize()

      // 새 타겟 위치에서 계산된 거리만큼 떨어진 곳으로 카메라 이동
      // 만약 direction 길이가 0이면 (카메라가 타겟에 있는 경우), 기본 방향 사용
      if (direction.lengthSq() === 0) {
        camera.position.copy(center)
        camera.position.z += cameraZ // 기본 Z축 방향으로 이동
      } else {
        camera.position.copy(center).addScaledVector(direction, cameraZ)
      }

      // 4. 컨트롤 업데이트
      controls.update()

      console.log('Camera target set to model center:', center)
    } else {
      if (!model)
        console.warn("Could not find model named 'shape' to focus on.")
      if (!controls)
        console.warn('OrbitControls not available to update target.')
      // 모델이 없거나 컨트롤이 없으면 기본 타겟 사용
      controls?.target.set(0, 0, 0)
      controls?.update()
    }
  }

  initOpenCascade()
    .then(openCascade => {
      // 유저 업로드 리스너
      const fileInput = document.getElementById('step-file')
      if (fileInput) {
        fileInput.addEventListener('input', async event => {
          if (event.target.files.length > 0) {
            // 기존 로직: 파일 로드 및 씬에 추가
            await loadSTEPorIGES(
              openCascade,
              event.target.files[0],
              addShapeToScene,
              scene
            )
            // --- 로드 완료 후 카메라 포커스 ---
            focusCameraOnModel()
            // --- ---

            event.target.value = ''
          }
        })
      } else {
        console.warn('File input element not found.')
      }

      // 테스트 버튼 리스너
      const testButtons = document.getElementsByClassName('test')
      for (const el of testButtons) {
        el.addEventListener('click', async e => {
          const filePath = e.target.name
          try {
            const blob = await fetch(filePath).then(res => {
              if (!res.ok) {
                throw new Error(
                  `Failed to fetch ${filePath}: ${res.statusText}`
                )
              }
              return res.blob()
            })
            const fileObject = new File([blob], filePath, {
              type: 'application/octet-stream',
            })

            // 기존 로직: 파일 로드 및 씬에 추가
            await loadSTEPorIGES(
              openCascade,
              fileObject,
              addShapeToScene,
              scene
            )

            // --- 로드 완료 후 카메라 포커스 ---
            focusCameraOnModel()
            // --- ---
          } catch (error) {
            console.error('Error loading test file:', error)
            const resultDiv = document.getElementById('result')
            if (resultDiv)
              resultDiv.textContent = `Error loading ${filePath}: ${error.message}`
          }
        })
      }
    })
    .catch(error => {
      console.error('Failed to initialize OpenCascade:', error)
      const resultDiv = document.getElementById('result')
      if (resultDiv)
        resultDiv.textContent = 'CAD 라이브러리를 초기화하는 데 실패했습니다.'
    })
}
