import initOpenCascadeJs from 'opencascade.js'

// OpenCascade.js 초기화
export const initOpenCascade = async () => {
  try {
    // 라이브러리가 로드되었는지 확인
    if (typeof initOpenCascadeJs === 'undefined') {
      throw new Error('OpenCascade.js 라이브러리를 찾을 수 없습니다.')
    }

    // 초기화 (로컬 파일 경로 지정)
    const openCascade = await initOpenCascadeJs()

    console.log('OpenCascade.js 초기화 완료')

    // UI 업데이트
    showTemplate('LOAD_SUCCESS')

    return openCascade
  } catch (error) {
    console.error('OpenCascade.js 초기화 오류:', error)
    showTemplate('LIB_ERROR', { message: error.message })
    throw error
  }
}

export const loadFileAsync = file => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export const getFileType = inputFile => {
  switch (inputFile.name.toLowerCase().split('.').pop()) {
    case 'step':
    case 'stp':
      return 'step'
    case 'iges':
    case 'igs':
      return 'iges'
    default:
      return undefined
  }
}

// 화면 표시 함수 - HTML 템플릿 통합 관리
export function showTemplate(key, data = {}) {
  const resultDiv = document.getElementById('result')

  switch (key) {
    case 'LOADING':
      resultDiv.innerHTML = `<div class="loading">STEP 파일 분석 중...</div>`
      break

    case 'LOAD_SUCCESS':
      resultDiv.innerHTML = `<p class="success">OpenCascade.js 로드 완료. STEP 파일을 선택해주세요.</p>`
      break

    case 'LIB_ERROR':
      resultDiv.innerHTML = `
          <div class="error">
            <h3>라이브러리 로드 오류</h3>
            <p>${data.message}</p>
            <p>브라우저 콘솔에서 추가 정보를 확인하세요.</p>
          </div>
        `
      break

    case 'INIT_ERROR':
      resultDiv.innerHTML = `
          <div class="error">
            <h3>라이브러리 오류</h3>
            <p>OpenCascade.js를 초기화할 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.</p>
          </div>
        `
      break

    case 'PROCESSING_ERROR':
      resultDiv.innerHTML = `
          <div class="error">
            <h3>오류 발생</h3>
            <p>${data.message}</p>
            <p>브라우저 콘솔에서 추가 정보를 확인하세요.</p>
          </div>
        `
      break

    case 'RESULTS':
      // 단위 이름(예: "MILLIMETRE")을 약어(예: "mm")로 변환하는 로직
      let unitSymbol = '?' // 기본값 (단위를 모를 경우)
      let lengthUnit = ''
      if (
        data.units &&
        data.units.length &&
        data.units.length !== '지정되지 않음' &&
        data.units.length !== '오류 발생'
      ) {
        lengthUnit = data.units.length.toUpperCase() // 대문자로 통일하여 비교 용이하게

        if (lengthUnit.includes('MILLIMETRE')) {
          unitSymbol = 'mm'
        } else if (lengthUnit.includes('INCH')) {
          unitSymbol = 'in'
        } else if (lengthUnit.includes('METRE')) {
          // STEP 표준 철자는 'METRE'
          unitSymbol = 'm'
        } else if (lengthUnit.includes('CENTIMETRE')) {
          unitSymbol = 'cm'
        } else {
          unitSymbol = data.units.length // 매핑 안되면 원본 이름 사용 (혹은 '?' 유지)
        }
      }

      resultDiv.innerHTML = `
            <div class="success">STEP 파일을 성공적으로 처리했습니다!</div>
            <h3>AABB 계산 결과</h3>
            <p>측정된 길이 단위: ${
              data.units && data.units.length ? data.units.length : '알 수 없음'
            }</p>
            <p>치수 (너비×높이×깊이): ${data.aabb.dimensions.x.toFixed(
              2
            )} × ${data.aabb.dimensions.y.toFixed(
        2
      )} × ${data.aabb.dimensions.z.toFixed(2)} (${unitSymbol})</p>
            <p>표면적: ${data.area.toFixed(2)} ${unitSymbol}²</p>
            <p>부피: ${data.volume.toFixed(2)} ${unitSymbol}³</p>
            <h4>좌표</h4>
            <p>최소 (X, Y, Z): (${data.aabb.min.x.toFixed(
              2
            )}, ${data.aabb.min.y.toFixed(2)}, ${data.aabb.min.z.toFixed(
        2
      )})</p>
            <p>최대 (X, Y, Z): (${data.aabb.max.x.toFixed(
              2
            )}, ${data.aabb.max.y.toFixed(2)}, ${data.aabb.max.z.toFixed(
        2
      )})</p>
          `
      break // case 문 끝에 break 추가
  }
}
