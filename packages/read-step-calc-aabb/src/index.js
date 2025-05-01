// **B-rep(Boundary Representation)**은 3D 객체를 그 경계면으로 표현하는 방식입니다. 객체는 면(Faces), 모서리(Edges), 꼭지점(Vertices)으로 구성되며, 이 요소들 간의 위상적 관계를 포함합니다. STEP 파일은 이러한 B-rep 데이터를 저장하는 표준 형식입니다.
// **AABB(Axis-Aligned Bounding Box)**는 3D 객체를 완전히 포함하는 가장 작은 직육면체로, 좌표축에 정렬된 형태입니다. 모델의 최소/최대 X, Y, Z 좌표로 정의됩니다.

import initOpenCascadeJs from 'opencascade.js'
import { showTemplate, calculateAABBArea, calculateAABBVolume } from './utils'

// 전역 변수
let oc = null
const fileInput = document.getElementById('stepFileInput')

// OpenCascade.js 초기화
async function initOpenCascade() {
  try {
    // 라이브러리가 로드되었는지 확인
    if (typeof initOpenCascadeJs === 'undefined') {
      throw new Error('OpenCascade.js 라이브러리를 찾을 수 없습니다.')
    }

    // 초기화 (로컬 파일 경로 지정)
    oc = await initOpenCascadeJs()

    console.log('OpenCascade.js 초기화 완료')

    // UI 업데이트
    showTemplate('LOAD_SUCCESS')

    return oc
  } catch (error) {
    console.error('OpenCascade.js 초기화 오류:', error)
    showTemplate('LIB_ERROR', { message: error.message })
    throw error
  }
}

// 페이지 로드 완료 시 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function () {
  fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0]
    if (file) {
      handleSTEPFile(file)
    }
  })

  // OpenCascade.js 초기화
  initOpenCascade().catch(err => {
    console.error('초기화 실패:', err)
  })
})

// 파일을 비동기적으로 읽는 함수
function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.readAsArrayBuffer(file) // ArrayBuffer로 변환 후 로드
    fileReader.onload = event => resolve(event.target.result) // ArrayBuffer 로드되면 resolve
    fileReader.onerror = error => reject(error)
  })
}

// STEP 파일 처리 함수
async function handleSTEPFile(file) {
  showTemplate('LOADING')

  // OpenCascade가 초기화되었는지 확인
  if (!oc) {
    try {
      oc = await initOpenCascade()
    } catch (error) {
      showTemplate('INIT_ERROR')
      return
    }
  }

  try {
    // 파일 내용을 ArrayBuffer로 읽기
    const fileContent = await readFileAsync(file)

    // 가상 파일 시스템에 파일 생성
    const fileType = file.name.toLowerCase().endsWith('.stp') ? 'stp' : 'step'
    const fileName = `file.${fileType}`

    // 기존 파일 제거 시도 (이미 존재할 경우)
    try {
      oc.FS.unlink(`/${fileName}`)
    } catch (e) {
      // 파일이 존재하지 않으면 오류 무시
    }

    // 새 파일 생성
    oc.FS.createDataFile('/', fileName, new Uint8Array(fileContent), true, true)
    console.log(`파일 '${fileName}'을 가상 파일 시스템에 생성했습니다.`)

    // STEP 리더 생성
    const stepReader = new oc.STEPControl_Reader_1()
    console.log('STEPControl_Reader 인스턴스 생성됨')

    // 파일 읽기
    const readResult = stepReader.ReadFile(fileName)

    if (readResult === oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log('STEP 파일 읽기 성공')

      // 루트 변환
      const progressRange = new oc.Message_ProgressRange_1()
      const numRootsTransferred = stepReader.TransferRoots(progressRange)
      console.log(`변환된 루트 수: ${numRootsTransferred}`)

      // 하나의 형상 가져오기
      const shape = stepReader.OneShape()

      if (shape) {
        console.log('형상 가져오기 성공')

        // AABB 계산
        const aabb = calculateAABBFromBRep(shape)

        // 결과 계산
        const result = {
          aabb: aabb,
          area: calculateAABBArea(aabb),
          volume: calculateAABBVolume(aabb),
        }

        showTemplate('RESULTS', result)
      } else {
        throw new Error('형상을 가져올 수 없습니다.')
      }
    } else {
      throw new Error('STEP 파일 읽기 실패')
    }

    // 사용 후 파일 제거
    oc.FS.unlink(`/${fileName}`)
  } catch (error) {
    console.error('STEP 처리 중 오류 발생:', error)
    showTemplate('PROCESSING_ERROR', { message: error.message })
  }
}

// B-rep 모델에서 AABB 계산
function calculateAABBFromBRep(shape) {
  // Bnd_Box 객체 생성
  const boundingBox = new oc.Bnd_Box_1()

  // 경계 박스 계산
  oc.BRepBndLib.Add(shape, boundingBox, true)

  // 경계 박스의 최소/최대 좌표 가져오기
  const pMin = boundingBox.CornerMin()
  const pMax = boundingBox.CornerMax()

  // 좌표 추출
  const xMin = pMin.X()
  const yMin = pMin.Y()
  const zMin = pMin.Z()
  const xMax = pMax.X()
  const yMax = pMax.Y()
  const zMax = pMax.Z()

  return {
    min: { x: xMin, y: yMin, z: zMin },
    max: { x: xMax, y: yMax, z: zMax },
    dimensions: {
      x: xMax - xMin,
      y: yMax - yMin,
      z: zMax - zMin,
    },
  }
}
