import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Color,
  Geometry,
  Mesh,
  MeshStandardMaterial,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import openCascadeHelper from './common/openCascadeHelper'

// 1.
const setupThreeJSViewport = () => {
  var scene = new Scene()
  var camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )

  var renderer = new WebGLRenderer({ antialias: true })
  const viewport = document.getElementById('viewport')
  const viewportRect = viewport.getBoundingClientRect()
  renderer.setSize(viewportRect.width, viewportRect.height)
  viewport.appendChild(renderer.domElement)

  const light = new AmbientLight(0x404040)
  scene.add(light)
  const directionalLight = new DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(0.5, 0.5, 0.5)
  scene.add(directionalLight)

  camera.position.set(0, 50, 100)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.screenSpacePanning = true
  controls.target.set(0, 50, 0)
  controls.update()

  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }
  animate()
  return scene
}
export { setupThreeJSViewport }

// 4.
const addShapeToScene = async (openCascade, shape, scene) => {
  openCascadeHelper.setOpenCascade(openCascade)

  const facelist = await openCascadeHelper.tessellate(shape)
  const [locVertexcoord, locNormalcoord, locTriIndices] =
    await openCascadeHelper.joinPrimitives(facelist)
  const tot_triangle_count = facelist.reduce(
    (a, b) => a + b.number_of_triangles,
    0
  )
  const [vertices, faces] = await openCascadeHelper.generateGeometry(
    tot_triangle_count,
    locVertexcoord,
    locNormalcoord,
    locTriIndices
  )

  const objectMat = new MeshStandardMaterial({
    color: new Color(0.9, 0.9, 0.9),
  })
  const geometry = new Geometry()
  geometry.vertices = vertices
  geometry.faces = faces
  const object = new Mesh(geometry, objectMat)
  object.name = 'shape'
  object.rotation.x = -Math.PI / 2
  scene.add(object)
}
export { addShapeToScene }

// 3.
const makePolygon = openCascade => {
  const builder = new openCascade.BRep_Builder()
  const aComp = new openCascade.TopoDS_Compound()
  builder.MakeCompound(aComp)
  const path = [
    [-50, 0, 0],
    [50, 0, 0],
    [50, 100, 0],
  ].map(([x, y, z]) => new openCascade.gp_Pnt_3(x, y, z))
  const makePolygon = new openCascade.BRepBuilderAPI_MakePolygon_3(
    path[0],
    path[1],
    path[2],
    true
  )
  const wire = makePolygon.Wire()
  const f = new openCascade.BRepBuilderAPI_MakeFace_15(wire, false)
  builder.Add(aComp, f.Shape())
  return aComp
}
export { makePolygon }
