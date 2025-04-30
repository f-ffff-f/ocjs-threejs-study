import initOpenCascade from 'opencascade.js'
import { setupThreeJSViewport, addShapeToScene, makePolygon } from './library'

const scene = setupThreeJSViewport()

initOpenCascade().then(openCascade => {
  addShapeToScene(openCascade, makePolygon(openCascade), scene)
})
