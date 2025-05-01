// OpenCascade.js를 Vite에서 사용하기 위한 방식
import initOpenCascadeJs from 'opencascade.js'

// 전역 변수
let oc = null
const fileInput = document.getElementById('stepFileInput')
const resultDiv = document.getElementById('result')

// OpenCascade.js 초기화
async function initOpenCascade() {
  try {
    // 라이브러리가 로드되었는지 확인
    if (typeof initOpenCascadeJs === 'undefined') {
      throw new Error('OpenCascade.js 라이브러리를 찾을 수 없습니다.')
    }

    // 초기화 (로컬 파일 경로 지정)
    oc = await initOpenCascadeJs({
      locateFile: file => `./lib/${file}`, // wasm 파일 위치 지정
    })
    console.log('OpenCascade.js 초기화 완료')

    // UI 업데이트
    resultDiv.innerHTML =
      '<p class="success">OpenCascade.js 로드 완료. STEP 파일을 선택해주세요.</p>'

    return oc
  } catch (error) {
    console.error('OpenCascade.js 초기화 오류:', error)
    resultDiv.innerHTML = `
        <div class="error">
          <h3>라이브러리 로드 오류</h3>
          <p>${error.message}</p>
          <p>브라우저 콘솔에서 추가 정보를 확인하세요.</p>
        </div>
      `
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
    const reader = new FileReader()
    reader.onload = event => resolve(event.target.result)
    reader.onerror = error => reject(error)
    reader.readAsArrayBuffer(file) // ArrayBuffer로 읽기
  })
}

// STEP 파일 처리 함수
async function handleSTEPFile(file) {
  resultDiv.innerHTML = '<div class="loading">STEP 파일 분석 중...</div>'

  // OpenCascade가 초기화되었는지 확인
  if (!oc) {
    try {
      oc = await initOpenCascade()
    } catch (error) {
      resultDiv.innerHTML = `
          <div class="error">
            <h3>라이브러리 오류</h3>
            <p>OpenCascade.js를 초기화할 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.</p>
          </div>
        `
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

    // STEP 리더 생성 (참고 코드에 맞게 수정)
    const reader = new oc.STEPControl_Reader_1()
    console.log('STEPControl_Reader 인스턴스 생성됨')

    // 파일 읽기
    const readResult = reader.ReadFile(fileName)

    if (readResult === oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log('STEP 파일 읽기 성공')

      // 루트 변환
      const progressRange = new oc.Message_ProgressRange_1()
      const numRootsTransferred = reader.TransferRoots(progressRange)
      console.log(`변환된 루트 수: ${numRootsTransferred}`)

      // 하나의 형상 가져오기
      const shape = reader.OneShape()

      if (shape) {
        console.log('형상 가져오기 성공')

        // AABB 계산
        const aabb = calculateAABB(shape)

        // 결과 계산
        const result = {
          aabb: aabb,
          area: calculateAABBArea(aabb),
          volume: calculateAABBVolume(aabb),
        }

        // 결과 표시
        displayResults(result)
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
    resultDiv.innerHTML = `
        <div class="error">
          <h3>오류 발생</h3>
          <p>${error.message}</p>
          <p>브라우저 콘솔에서 추가 정보를 확인하세요.</p>
        </div>
      `
  }
}

// B-rep 모델에서 AABB 계산
function calculateAABB(shape) {
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

// AABB의 표면적 계산
function calculateAABBArea(aabb) {
  const width = aabb.dimensions.x
  const height = aabb.dimensions.y
  const depth = aabb.dimensions.z

  // 직육면체의 표면적 = 2(너비×높이 + 너비×깊이 + 높이×깊이)
  const surfaceArea = 2 * (width * height + width * depth + height * depth)

  return surfaceArea
}

// AABB의 부피 계산
function calculateAABBVolume(aabb) {
  return aabb.dimensions.x * aabb.dimensions.y * aabb.dimensions.z
}

// 결과 화면에 표시하는 함수
function displayResults(result) {
  resultDiv.innerHTML = `
      <div class="success">STEP 파일을 성공적으로 처리했습니다!</div>
      <h3>AABB 계산 결과</h3>
      <p>치수: ${result.aabb.dimensions.x.toFixed(
        2
      )} × ${result.aabb.dimensions.y.toFixed(
    2
  )} × ${result.aabb.dimensions.z.toFixed(2)}</p>
      <p>표면적: ${result.area.toFixed(2)} 제곱 단위</p>
      <p>부피: ${result.volume.toFixed(2)} 입방 단위</p>
      <h4>좌표</h4>
      <p>최소: (${result.aabb.min.x.toFixed(2)}, ${result.aabb.min.y.toFixed(
    2
  )}, ${result.aabb.min.z.toFixed(2)})</p>
      <p>최대: (${result.aabb.max.x.toFixed(2)}, ${result.aabb.max.y.toFixed(
    2
  )}, ${result.aabb.max.z.toFixed(2)})</p>
    `
}
