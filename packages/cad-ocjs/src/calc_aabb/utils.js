// 형상에서 AABB 계산
export function calculateAABBFromShape(shape, openCascade) {
  // Bnd_Box 객체 생성
  const boundingBox = new openCascade.Bnd_Box_1()

  // 경계 박스 계산
  openCascade.BRepBndLib.Add(shape, boundingBox, true)

  // 경계 박스의 최소/최대 좌표 가져오기
  const pMin = boundingBox.CornerMin()
  const pMax = boundingBox.CornerMax()

  // 좌표 추출
  const xMin = pMin.X()
  const yMin = pMin.Y()
  const zMin = pMin.Z()
  const xMax = pMax.X()
  const yMax = pMax.Y()
  const zMax = pMax.Z()

  return {
    min: { x: xMin, y: yMin, z: zMin },
    max: { x: xMax, y: yMax, z: zMax },
    dimensions: {
      x: xMax - xMin,
      y: yMax - yMin,
      z: zMax - zMin,
    },
  }
}

// AABB의 표면적 계산
export function calculateAABBArea(aabb) {
  const width = aabb.dimensions.x
  const height = aabb.dimensions.y
  const depth = aabb.dimensions.z

  // 직육면체의 표면적 = 2(너비×높이 + 너비×깊이 + 높이×깊이)
  const surfaceArea = 2 * (width * height + width * depth + height * depth)

  return surfaceArea
}

// AABB의 부피 계산
export function calculateAABBVolume(aabb) {
  return aabb.dimensions.x * aabb.dimensions.y * aabb.dimensions.z
}
