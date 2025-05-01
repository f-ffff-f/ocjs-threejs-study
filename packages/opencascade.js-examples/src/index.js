import initOpenCascade from 'opencascade.js'
import { setupThreeJSViewport, addShapeToScene, makePolygon } from './library'

// 1.
const scene = setupThreeJSViewport()

// 2.
initOpenCascade().then(openCascade => {
  addShapeToScene(openCascade, makePolygon(openCascade), scene)
})
