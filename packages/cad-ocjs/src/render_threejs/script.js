import { initOpenCascade } from '../share'
import {
  loadSTEPorIGES,
  setupThreeJSViewport,
  addShapeToScene,
} from './library'

const scene = setupThreeJSViewport()

initOpenCascade().then(openCascade => {
  document
    .getElementById('step-file')
    .addEventListener('input', async event => {
      await loadSTEPorIGES(
        openCascade,
        event.target.files[0],
        addShapeToScene,
        scene
      )
    })
})
