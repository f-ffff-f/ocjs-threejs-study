import * as THREE from 'three' // THREE 네임스페이스 사용
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import openCascadeHelper from './openCascadeHelper'
import { loadFileAsync, getFileType } from '../share'
import { updateViewCube } from '../viewCube' // 뷰큐브 업데이트 함수 import

const loadSTEPorIGES = async (openCascade, inputFile, addFunction, scene) => {
  const fileType = getFileType(inputFile)
  const fileName = `file.${fileType}`

  await loadFileAsync(inputFile).then(async fileText => {
    // Writes the uploaded file to Emscripten's Virtual Filesystem
    openCascade.FS.createDataFile('/', fileName, fileText, true, true)

    // Choose the correct OpenCascade file parsers to read the CAD file
    var reader = null
    if (fileType === 'step') {
      reader = new openCascade.STEPControl_Reader_1()
    } else if (fileType === 'iges') {
      reader = new openCascade.IGESControl_Reader_1()
    } else {
      console.error("opencascade.js can't parse this extension! (yet)")
    }
    const readResult = reader.ReadFile(fileName) // Read the file
    if (readResult === openCascade.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log('file loaded successfully!     Converting to OCC now...')
      const numRootsTransferred = reader.TransferRoots(
        new openCascade.Message_ProgressRange_1()
      ) // Translate all transferable roots to OpenCascade
      const stepShape = reader.OneShape() // Obtain the results of translation in one OCCT shape
      console.log(
        inputFile.name + ' converted successfully!  Triangulating now...'
      )

      // Out with the old, in with the new!
      scene.remove(scene.getObjectByName('shape'))
      await addFunction(openCascade, stepShape, scene)
      console.log(inputFile.name + ' triangulated and added to the scene!')

      // Remove the file when we're done (otherwise we run into errors on reupload)
      openCascade.FS.unlink(`/file.${fileType}`)
    } else {
      console.error(
        'Something in OCCT went wrong trying to read ' + inputFile.name
      )
    }
  })
}
export { loadSTEPorIGES }

export const setupThreeJSViewport = () => {
  var scene = new THREE.Scene() // THREE 네임스페이스 사용
  scene.background = new THREE.Color(0xeeeeee) // 배경색 설정

  var camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight, // 초기 비율, resize에서 업데이트 필요
    0.1,
    1000000
  )

  var renderer = new THREE.WebGLRenderer({ antialias: true })
  const viewport = document.getElementById('viewport')
  // 초기 크기 설정
  renderer.setSize(viewport.clientWidth, viewport.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  viewport.appendChild(renderer.domElement)

  const light = new THREE.AmbientLight(0x404040, 2) // 강도 조절
  scene.add(light)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5) // 강도 조절
  directionalLight.position.set(50, 100, 75) // 위치 조절
  scene.add(directionalLight)
  // 추가 조명 (선택 사항)
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight2.position.set(-50, -50, -50)
  scene.add(directionalLight2)

  camera.position.set(0, 50, 100) // 초기 카메라 위치

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.screenSpacePanning = true
  controls.target.set(0, 0, 0) // 타겟을 원점으로 초기화
  controls.enableDamping = true // 부드러운 움직임
  controls.dampingFactor = 0.05
  controls.update()

  // --- 애니메이션 루프 ---
  function animate() {
    requestAnimationFrame(animate)
    controls.update() // OrbitControls 업데이트 (damping 사용 시 필수)
    renderer.render(scene, camera) // 메인 Scene 렌더링
    updateViewCube() // 뷰큐브 업데이트 및 렌더링
  }
  animate() // 애니메이션 시작

  // --- 창 크기 조절 처리 ---
  function onWindowResize() {
    const vp = document.getElementById('viewport')
    if (!vp) return
    const width = vp.clientWidth
    const height = vp.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
    // 뷰큐브 렌더러는 크기가 고정되어 있으므로 업데이트할 필요 없음
  }
  window.addEventListener('resize', onWindowResize)

  // 필요한 객체들 반환
  return { scene, camera, controls, renderer }
}

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

  const objectMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.9, 0.9, 0.9),
  })
  const geometry = new THREE.Geometry()
  geometry.vertices = vertices
  geometry.faces = faces
  const object = new THREE.Mesh(geometry, objectMat)

  console.log(object)
  object.name = 'shape'
  object.rotation.x = -Math.PI / 2
  scene.add(object)
}
export { addShapeToScene }
