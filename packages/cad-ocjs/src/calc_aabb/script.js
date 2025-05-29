// **B-rep(Boundary Representation)**은 3D 객체를 그 경계면으로 표현하는 방식입니다. 객체는 면(Faces), 모서리(Edges), 꼭지점(Vertices)으로 구성되며, 이 요소들 간의 위상적 관계를 포함합니다. STEP 파일은 이러한 B-rep 데이터를 저장하는 표준 형식입니다.
// **AABB(Axis-Aligned Bounding Box)**는 3D 객체를 완전히 포함하는 가장 작은 직육면체로, 좌표축에 정렬된 형태입니다. 모델의 최소/최대 X, Y, Z 좌표로 정의됩니다.
import {
  calculateAABBFromShape,
  calculateAABBArea,
  calculateAABBVolume,
} from './utils'
import {
  initOpenCascade,
  loadFileAsync,
  getFileType,
  showTemplate,
} from '../share'

initOpenCascade().then(openCascade => {
  //  유저 업로드
  document
    .getElementById('step-file')
    .addEventListener('change', async event => {
      await loadSTEPorIGES(event.target.files[0], openCascade)
    })

  // 테스트
  const els = document.getElementsByClassName('test')
  for (const el of els) {
    el.addEventListener('click', async e => {
      const filePath = e.target.name
      const blob = await fetch(filePath).then(res => res.blob())
      const fileObject = new File([blob], filePath, {
        type: 'application/octet-stream',
      })
      await loadSTEPorIGES(fileObject, openCascade)
    })
  }
})

// STEP 파일은 B-rep 데이터를 저장하는 표준 형식.
async function loadSTEPorIGES(file, openCascade) {
  showTemplate('LOADING')

  try {
    // wasm 모듈 파일 시스템에 생성할 파일 이름
    const fileType = getFileType(file)
    const fileName = `file.${fileType}`

    // 기존 파일 제거 시도 (이미 존재할 경우)
    try {
      openCascade.FS.unlink(`/${fileName}`)
    } catch (e) {
      // 파일이 존재하지 않으면 오류 무시
    }

    // 자바스크립트가 cad파일을 플레인 텍스트로 변환한다
    const fileText = await loadFileAsync(file)
    console.log(fileText)

    // 자바스크립트가 wasm 모듈 파일시스템에 파일을 추가한다
    openCascade.FS.createDataFile('/', fileName, fileText, true, true)
    console.log(`파일 '${fileName}'을 가상 파일 시스템에 생성했습니다.`)

    // STEP 리더 생성
    const stepReader = new openCascade.STEPControl_Reader_1()
    console.log('STEPControl_Reader 인스턴스 생성됨')

    // 파일 읽기
    const readResult = stepReader.ReadFile(fileName)

    if (readResult === openCascade.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log('STEP 파일 읽기 성공')

      // ***** STEP 파일 단위 정보 확인 (OpenCascade.js 기반) ******
      let lengthUnit = '지정되지 않음'
      let angleUnit = '지정되지 않음'

      try {
        // 단위 정보를 저장할 시퀀스 객체 생성
        const lengthUnits = new openCascade.TColStd_SequenceOfAsciiString_1()
        const angleUnits = new openCascade.TColStd_SequenceOfAsciiString_1()
        const solidAngleUnits =
          new openCascade.TColStd_SequenceOfAsciiString_1()

        stepReader.FileUnits(lengthUnits, angleUnits, solidAngleUnits)

        // 길이 단위 정보 처리
        if (lengthUnits.Length() > 0) {
          lengthUnit = lengthUnits.Value(1).ToCString()
          console.log(`파일에 정의된 길이 단위: ${lengthUnit}`)
        } else {
          console.warn('파일에서 길이 단위를 찾을 수 없습니다.')
        }

        // 각도 단위 정보 처리
        if (angleUnits.Length() > 0) {
          angleUnit = angleUnits.Value(1).ToCString()
          console.log(`파일에 정의된 각도 단위: ${angleUnit}`)
        } else {
          console.warn('파일에서 각도 단위를 찾을 수 없습니다.')
        }
      } catch (unitError) {
        console.error('단위 정보 추출 중 오류 발생:', unitError)
        console.error('오류 상세 정보:', unitError.message)
        // 오류 발생 시에도 기본값 유지
        lengthUnit = '오류 발생'
        angleUnit = '오류 발생'
      }

      // 결과 출력
      console.log(`파일의 길이 단위: ${lengthUnit}`)
      console.log(`파일의 각도 단위: ${angleUnit}`)
      // ***** 단위 정보 확인 끝 ******

      // 루트 변환
      const progressRange = new openCascade.Message_ProgressRange_1()
      const numRootsTransferred = stepReader.TransferRoots(progressRange)
      console.log(`변환된 루트 수: ${numRootsTransferred}`)

      // 하나의 형상 가져오기
      const shape = stepReader.OneShape()

      if (shape) {
        console.log('형상 가져오기 성공')

        // AABB 계산
        const aabb = calculateAABBFromShape(shape, openCascade)

        // 결과 계산
        const result = {
          aabb: aabb,
          area: calculateAABBArea(aabb),
          volume: calculateAABBVolume(aabb),
          units: {
            length: lengthUnit,
            angle: angleUnit,
          },
        }

        showTemplate('RESULTS', result)
      } else {
        throw new Error('형상을 가져올 수 없습니다.')
      }
    } else {
      throw new Error('STEP 파일 읽기 실패')
    }

    // 사용 후 파일 제거
    openCascade.FS.unlink(`/${fileName}`)
  } catch (error) {
    console.error('STEP 처리 중 오류 발생:', error)
    showTemplate('PROCESSING_ERROR', { message: error.message })
  }
}
