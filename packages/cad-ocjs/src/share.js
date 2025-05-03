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
      resultDiv.innerHTML = `
          <div class="success">STEP 파일을 성공적으로 처리했습니다!</div>
          <h3>AABB 계산 결과</h3>
          <p>치수: ${data.aabb.dimensions.x.toFixed(
            2
          )} × ${data.aabb.dimensions.y.toFixed(
        2
      )} × ${data.aabb.dimensions.z.toFixed(2)}</p>
          <p>표면적: ${data.area.toFixed(2)} 제곱 단위</p>
          <p>부피: ${data.volume.toFixed(2)} 입방 단위</p>
          <h4>좌표</h4>
          <p>최소: (${data.aabb.min.x.toFixed(2)}, ${data.aabb.min.y.toFixed(
        2
      )}, ${data.aabb.min.z.toFixed(2)})</p>
          <p>최대: (${data.aabb.max.x.toFixed(2)}, ${data.aabb.max.y.toFixed(
        2
      )}, ${data.aabb.max.z.toFixed(2)})</p>
        `
      break
  }
}
