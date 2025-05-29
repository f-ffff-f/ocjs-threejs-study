import initOpenCascadeJs from 'opencascade.js'

const openCascade = await initOpenCascadeJs()

const result = document.getElementById('result')

// const pnt = new openCascade.gp_Pnt_3(1, 1, 1)

// result.textContent = `${pnt.X()}, ${pnt.Y()}, ${pnt.Z()}`

const myBoxShape = new openCascade.BRepPrimAPI_MakeBox_2(1, 1, 1).Shape()

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

const mass = `mass: ${volumeProperties.Mass()}`

const surfaceProperties = new openCascade.GProp_GProps_1()

openCascade.BRepGProp.SurfaceProperties_1(
  myBoxShape,
  surfaceProperties,
  false,
  false
)

const surfaceArea = `surfaceArea: ${surfaceProperties.Mass()}`

result.textContent = `${mass} ${surfaceArea}`
