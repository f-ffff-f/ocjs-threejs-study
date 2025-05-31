// [OCAF 문서 생성] → [문서에 원본 shape 등록 및 식별자(레이블) 부여] → [등록된 shape 객체 자체의 각 Face에 메시 정보 직접 추가/저장] → [OCAF 문서 내의, 메시 정보가 추가된 shape를 참조하여 GLB 파일로 가상 파일 시스템에 저장] → [가상 파일 시스템의 GLB 파일 내용을 읽어와 웹 브라우저에서 사용할 수 있는 Object URL로 변환 후 반환]

export default function shapeToUrl(oc, shape) {
  // --- 1. OCAF 문서 생성 및 Shape 추가 ---
  // new oc.Handle_TDocStd_Document_2(...)를 통해 OCAF 문서를 생성합니다. 이 문서는 형상, 메타데이터, 그리고 우리가 추가할 메시 정보 등을 담을 수 있는 일종의 프로젝트 파일 또는 컨테이너 역할을 합니다.
  const docHandle = new oc.Handle_TDocStd_Document_2(
    new oc.TDocStd_Document(new oc.TCollection_ExtendedString_1())
  )
  //   XCAFDoc_DocumentTool.ShapeTool(...)을 가져오고, 이 ShapeTool을 사용하여 앞서 생성한 OCAF 문서 내에 shape 객체를 등록하고 식별 가능하게 만듭니다.
  // shapeTool.NewShape()는 OCAF 문서 내에 이 shape를 위한 고유한 레이블(일종의 ID 또는 '자리')을 만듭니다.
  const shapeTool = oc.XCAFDoc_DocumentTool.ShapeTool(
    docHandle.get().Main()
  ).get()
  // shapeTool.SetShape(레이블, shape)는 해당 레이블에 shape 객체(또는 그 정보)를 저장합니다. "포인터를 생성한다"는 표현보다는 "문서 내에 형상을 저장/등록하고, 이 형상에 접근할 수 있는 경로(레이블)를 만든다"고 이해하시면 더 정확합니다.
  shapeTool.SetShape(shapeTool.NewShape(), shape)

  // --- 2. 형상에 대한 메시(Tessellation) 생성 ---
  //   new oc.BRepMesh_IncrementalMesh_2(shape, ...) 호출은 인자로 전달된 shape 객체 자체를 수정합니다. 구체적으로는 shape을 구성하는 각 TopoDS_Face 객체 내부에 Poly_Triangulation이라는 실제 메시 데이터를 생성하여 연결(저장)합니다.
  //   그래서 shape 객체는 이 호출 이후에 자신의 기하학적 정보와 더불어 표면 메시 정보까지 함께 가지게 됩니다.
  new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.1, false)

  // --- 3. OCAF 문서를 GLB 파일로 내보내기 ---
  //   RWGltf_CafWriter는 OCAF 문서(docHandle)를 인자로 받습니다. 작가(Writer)는 이 문서를 열어서, 그 안에 등록된 shape(이제 풍부한 메시 정보를 내부에 포함하고 있는)를 찾습니다.
  const cafWriter = new oc.RWGltf_CafWriter(
    new oc.TCollection_AsciiString_2('./file.glb'),
    true
  )
  cafWriter.Perform_2(
    docHandle,
    new oc.TColStd_IndexedDataMapOfStringString_1(),
    new oc.Message_ProgressRange_1()
  )

  // --- 4. 가상 파일 시스템에서 GLB 파일 읽기 ---
  //   oc.FS.readFile("./file.glb", { encoding: "binary" })를 통해 가상 파일 시스템에서 GLB 파일 내용을 바이트 배열(Uint8Array) 형태로 읽어옵니다.
  const glbFile = oc.FS.readFile('./file.glb', { encoding: 'binary' })

  // --- 5. 읽어온 GLB 데이터로부터 Object URL 생성 ---
  //   그다음 URL.createObjectURL(new Blob([glbFile.buffer], { type: "model/gltf-binary" }))를 사용하여 이 바이트 배열을 브라우저가 직접 참조하고 로드할 수 있는 임시 URL(Object URL)로 만듭니다. 이 URL을 웹페이지의 3D 뷰어(예: <model-viewer>, three.js의 GLTFLoader)에 전달하면 3D 모델이 화면에 보이게 되는 것이죠..
  return URL.createObjectURL(
    new Blob([glbFile.buffer], { type: 'model/gltf-binary' })
  )
}
