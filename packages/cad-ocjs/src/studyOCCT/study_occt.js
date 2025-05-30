import initOpenCascadeJs from 'opencascade.js'

const openCascade = await initOpenCascadeJs()

const result = document.getElementById('result')

const myBoxShape = new openCascade.BRepPrimAPI_MakeBox_2(2, 2, 2).Shape()

const myBoxShapeTypeString = openCascade.TopAbs.ShapeTypeToString(
  myBoxShape.ShapeType()
)

const explorer = new openCascade.TopExp_Explorer_1()

let faceCount = 0
let surfaceGeometryType = ''
for (
  explorer.Init(
    myBoxShape,
    openCascade.TopAbs_ShapeEnum.TopAbs_FACE,
    openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE
  );
  explorer.More();
  explorer.Next()
) {
  faceCount++

  if (faceCount === 1) {
    const aLoc = new openCascade.TopLoc_Location_1()
    const face = openCascade.TopoDS.Face_1(explorer.Current())
    const surfaceGeometry = openCascade.BRep_Tool.Surface_1(face, aLoc)
    surfaceGeometryType = surfaceGeometry.get().DynamicType().get().Name()
  }
}

let edgeCount = 0
for (
  explorer.Init(
    myBoxShape,
    openCascade.TopAbs_ShapeEnum.TopAbs_EDGE,
    openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE
  );
  explorer.More();
  explorer.Next()
) {
  edgeCount++
}

let vertexCount = 0
for (
  explorer.Init(
    myBoxShape,
    openCascade.TopAbs_ShapeEnum.TopAbs_VERTEX,
    openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE
  );
  explorer.More();
  explorer.Next()
) {
  vertexCount++
}

// Geomatry Properties 카테고리의 Geomatry Properties 객체 라는 뜻
const volumeProperties = new openCascade.GProp_GProps_1()

// BRep에서 Geometry Properties를 계산하는 함수모음
openCascade.BRepGProp.VolumeProperties_1(
  myBoxShape,
  volumeProperties,
  false,
  false,
  false
)

const mass = volumeProperties.Mass()

const surfaceProperties = new openCascade.GProp_GProps_1()

openCascade.BRepGProp.SurfaceProperties_1(
  myBoxShape,
  surfaceProperties,
  false,
  false
)

const surfaceArea = surfaceProperties.Mass()

result.textContent = `topological shape: ${myBoxShapeTypeString} | geometry type of face: ${surfaceGeometryType} | number of faces: ${faceCount} | number of edges: ${edgeCount} | number of vertices: ${vertexCount} | mass: ${mass}  surfaceArea: ${surfaceArea}`
