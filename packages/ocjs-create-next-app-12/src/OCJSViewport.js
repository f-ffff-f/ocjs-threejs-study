import { useState, useEffect } from 'react'
import shapeToUrl from '../src/shapeToUrl'
import initOpenCascade from 'opencascade.js'
import '@google/model-viewer'

export default function OCJSViewport() {
  const [modelUrl, setModelUrl] = useState()
  useEffect(() => {
    // OpenCASCADE.js (oc) 라이브러리를 비동기적으로 초기화하고, 초기화가 완료되면 콜백 함수를 실행합니다.
    initOpenCascade().then(oc => {
      // --- 1. 기본 형상 생성 ---
      // oc.BRepPrimAPI_MakeSphere_1 클래스를 사용하여 원점에 중심을 두고 반지름이 1인 구(Sphere) 형상을 생성합니다.
      // _1은 생성자의 특정 오버로드를 나타냅니다 (이 경우, gp_Pnt(0,0,0), Radius).
      const sphere = new oc.BRepPrimAPI_MakeSphere_1(1)

      // --- 2. Cut 연산을 수행하는 헬퍼 함수 정의 ---
      // shape: 원본 TopoDS_Shape 객체
      // translation: [x, y, z] 배열 형태의 이동 벡터
      // scale: 스케일링 팩터
      // 이 함수는 원본 shape에서, 주어진 translation과 scale로 변환된 sphere를 빼내는(Cut) 연산을 수행합니다.
      const makeCut = (shape, translation, scale) => {
        // gp_Trsf: 기하학적 변환(이동, 회전, 스케일링 등)을 정의하는 객체입니다.
        const tf = new oc.gp_Trsf_1()
        // SetTranslation_1: 평행 이동 변환을 설정합니다. gp_Vec_4는 3차원 벡터를 생성합니다.
        tf.SetTranslation_1(
          new oc.gp_Vec_4(translation[0], translation[1], translation[2])
        )
        // SetScaleFactor: 균일 스케일링 변환을 설정합니다.
        // 중요: 이 스케일링은 변환(tf) 자체에 적용되며, 이 변환이 적용될 형상의 기준점(일반적으로 원점)을 중심으로 스케일링됩니다.
        tf.SetScaleFactor(scale)
        // TopLoc_Location_2: gp_Trsf로부터 위치(Location) 정보를 생성합니다. 형상을 이동/회전/스케일링할 때 사용됩니다.
        const loc = new oc.TopLoc_Location_2(tf)

        // BRepAlgoAPI_Cut_3: 두 형상 간의 불리언 차집합(Cut) 연산을 수행하는 알고리즘 객체입니다.
        // 첫 번째 인자: 연산을 당하는 형상 (Object)
        // 두 번째 인자: 연산을 가하는 형상 (Tool). 여기서는 원본 sphere를 가져와(sphere.Shape()) 정의된 loc으로 이동/스케일링(Moved(loc, false))시킵니다.
        //   Moved(loc, false)의 두 번째 인자 false는 원본 형상을 복사하여 변환함을 의미합니다.
        // oc.Message_ProgressRange_1(): 연산 진행 상태를 모니터링하기 위한 객체 (여기서는 기본 생성자 사용).
        const cut = new oc.BRepAlgoAPI_Cut_3(
          shape,
          sphere.Shape().Moved(loc, false),
          new oc.Message_ProgressRange_1()
        )
        // Build: 불리언 연산을 실제로 수행합니다.
        cut.Build(new oc.Message_ProgressRange_1())

        // 연산 결과로 생성된 새로운 TopoDS_Shape를 반환합니다.
        return cut.Shape()
      }

      // --- 3. 연속적인 Cut 연산 수행 ---
      // cut1: 원본 구(sphere.Shape())의 중심에서 Z축으로 0.7만큼 이동한 동일 크기(scale=1)의 구를 빼냅니다.
      const cut1 = makeCut(sphere.Shape(), [0, 0, 0.7], 1)
      // cut2: cut1의 결과 형상에서 Z축으로 -0.7만큼 이동한 동일 크기의 구를 빼냅니다.
      const cut2 = makeCut(cut1, [0, 0, -0.7], 1)
      // cut3: cut2의 결과 형상에서 [0, 0.25, 1.75] 위치로 이동하고 1.825배 스케일링된 구를 빼냅니다.
      const cut3 = makeCut(cut2, [0, 0.25, 1.75], 1.825)
      // cut4: cut3의 결과 형상에서 [4.8, 0, 0] 위치로 이동하고 5배 스케일링된 구를 빼냅니다.
      const cut4 = makeCut(cut3, [4.8, 0, 0], 5)

      // --- 4. 회전 변환을 위한 TopLoc_Location을 생성하는 헬퍼 함수 정의 ---
      // rotation: 회전 각도 (라디안 단위)
      const makeRotation = rotation => {
        // gp_Trsf: 기하학적 변환 객체를 생성합니다.
        const tf = new oc.gp_Trsf_1()
        // SetRotation_1: 회전 변환을 설정합니다.
        // 첫 번째 인자 (회전축): oc.gp_Ax1_2는 회전축을 정의합니다.
        //   oc.gp_Pnt_1(): 원점(0,0,0)을 나타내는 점.
        //   oc.gp_Dir_4(0, 0, 1): Z축 방향 벡터 (0,0,1).
        //   즉, 원점을 지나고 Z축 방향을 갖는 축을 기준으로 회전합니다.
        // 두 번째 인자 (회전각): 라디안 단위의 회전 각도.
        tf.SetRotation_1(
          new oc.gp_Ax1_2(new oc.gp_Pnt_1(), new oc.gp_Dir_4(0, 0, 1)),
          rotation
        )
        // TopLoc_Location_2: 변환 정보(tf)를 담는 위치 객체를 생성합니다.
        const loc = new oc.TopLoc_Location_2(tf)
        // 생성된 위치 객체를 반환합니다.
        return loc
      }

      // --- 5. Fuse 연산 및 최종 형상 변환 ---
      // BRepAlgoAPI_Fuse_3: 두 형상 간의 불리언 합집합(Fuse) 연산을 수행하는 알고리즘 객체입니다.
      // 첫 번째 인자: 합칠 첫 번째 형상 (cut4).
      // 두 번째 인자: 합칠 두 번째 형상. cut4를 Z축 기준으로 180도(Math.PI 라디안) 회전시킨 형상입니다.
      const fuse = new oc.BRepAlgoAPI_Fuse_3(
        cut4,
        cut4.Moved(makeRotation(Math.PI), false),
        new oc.Message_ProgressRange_1()
      )
      // Build: 불리언 연산을 실제로 수행합니다.
      fuse.Build(new oc.Message_ProgressRange_1())
      // 최종 형상(result): Fuse 연산 결과로 얻어진 형상(fuse.Shape())을 Z축 기준으로 -30도 (RADIANS = DEGREES * Math.PI / 180) 회전시킵니다.
      const result = fuse
        .Shape()
        .Moved(makeRotation((-30 * Math.PI) / 180), false)

      // --- 6. 결과 처리 ---
      // shapeToUrl: (아마도 사용자 정의 함수) oc (OCCT 모듈)과 최종 형상(result)을 인자로 받아,
      // 형상을 웹에서 표시 가능한 URL (예: Base64 인코딩된 STL, GLTF 등)로 변환합니다.
      // setModelUrl: React의 상태 업데이트 함수로, 변환된 URL을 modelUrl 상태에 저장하여 3D 뷰어 컴포넌트 등이 이를 사용하도록 합니다.
      setModelUrl(shapeToUrl(oc, result))
    })
  }, []) // useEffect의 의존성 배열이 비어있으므로, 이 효과는 컴포넌트가 마운트될 때 한 번만 실행됩니다.

  return modelUrl === undefined ? (
    'Loading...'
  ) : (
    <model-viewer class="viewport" src={modelUrl} camera-controls />
  )
}
