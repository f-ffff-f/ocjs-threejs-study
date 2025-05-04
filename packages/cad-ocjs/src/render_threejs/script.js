import { initOpenCascade } from '../share'
import {
  loadSTEPorIGES,
  setupThreeJSViewport,
  addShapeToScene,
} from './library'

const scene = setupThreeJSViewport()

initOpenCascade().then(openCascade => {
  //  유저 업로드
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

  // 테스트
  const els = document.getElementsByClassName('test')
  for (const el of els) {
    el.addEventListener('click', async e => {
      const filePath = e.target.name
      const blob = await fetch(filePath).then(res => res.blob())
      const fileObject = new File([blob], filePath, {
        type: 'application/octet-stream',
      })
      await loadSTEPorIGES(openCascade, fileObject, addShapeToScene, scene)
    })
  }
})
