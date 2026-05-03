import * as THREE from 'three'

/**
 * Export a Three.js Group as a COLLADA (.dae) file.
 * Produces valid XML that SketchUp, Blender, and other 3D tools can import.
 * Preserves per-mesh colors. Units in meters (Three.js scene units).
 */
export function exportCollada(group: THREE.Group, filename: string) {
  const meshes: { positions: number[]; indices: number[]; color: string; name: string }[] = []

  let meshIdx = 0
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const geo = obj.geometry as THREE.BufferGeometry
    const mat = obj.material as THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial

    // Get world-space positions
    const posAttr = geo.getAttribute('position')
    const index = geo.getIndex()
    if (!posAttr) return

    const positions: number[] = []
    const tempVec = new THREE.Vector3()

    for (let i = 0; i < posAttr.count; i++) {
      tempVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
      obj.localToWorld(tempVec)
      // Scale to millimeters for SketchUp (our scene units are 0.01 per mm)
      positions.push(tempVec.x * 100, tempVec.y * 100, tempVec.z * 100)
    }

    const indices: number[] = []
    if (index) {
      for (let i = 0; i < index.count; i++) {
        indices.push(index.getX(i))
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(i)
      }
    }

    // Get color as hex
    const color = mat.color ? `#${mat.color.getHexString()}` : '#888888'

    meshes.push({
      positions,
      indices,
      color,
      name: `mesh_${meshIdx++}`,
    })
  })

  // Collect unique colors as materials
  const colorSet = new Set(meshes.map(m => m.color))
  const materials = Array.from(colorSet).map((hex, i) => ({
    id: `mat_${i}`,
    color: hex,
  }))
  const colorToMat = new Map(materials.map(m => [m.color, m.id]))

  // Build COLLADA XML
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <created>${new Date().toISOString()}</created>
    <modified>${new Date().toISOString()}</modified>
    <unit name="millimeter" meter="0.001"/>
    <up_axis>Z_UP</up_axis>
  </asset>
  <library_effects>
${materials.map(m => {
  const r = parseInt(m.color.slice(1, 3), 16) / 255
  const g = parseInt(m.color.slice(3, 5), 16) / 255
  const b = parseInt(m.color.slice(5, 7), 16) / 255
  return `    <effect id="${m.id}-effect">
      <profile_COMMON>
        <technique sid="common">
          <phong>
            <diffuse>
              <color sid="diffuse">${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} 1</color>
            </diffuse>
          </phong>
        </technique>
      </profile_COMMON>
    </effect>`
}).join('\n')}
  </library_effects>
  <library_materials>
${materials.map(m => `    <material id="${m.id}" name="${m.id}">
      <instance_effect url="#${m.id}-effect"/>
    </material>`).join('\n')}
  </library_materials>
  <library_geometries>
${meshes.map(m => {
  const vertCount = m.positions.length / 3
  const triCount = m.indices.length / 3
  return `    <geometry id="${m.name}-geo" name="${m.name}">
      <mesh>
        <source id="${m.name}-positions">
          <float_array id="${m.name}-positions-array" count="${m.positions.length}">${m.positions.map(v => v.toFixed(4)).join(' ')}</float_array>
          <technique_common>
            <accessor source="#${m.name}-positions-array" count="${vertCount}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="${m.name}-vertices">
          <input semantic="POSITION" source="#${m.name}-positions"/>
        </vertices>
        <triangles material="${colorToMat.get(m.color)}-material" count="${triCount}">
          <input semantic="VERTEX" source="#${m.name}-vertices" offset="0"/>
          <p>${m.indices.join(' ')}</p>
        </triangles>
      </mesh>
    </geometry>`
}).join('\n')}
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="Scene" name="Scene">
${meshes.map(m => `      <node id="${m.name}" name="${m.name}" type="NODE">
        <instance_geometry url="#${m.name}-geo">
          <bind_material>
            <technique_common>
              <instance_material symbol="${colorToMat.get(m.color)}-material" target="#${colorToMat.get(m.color)}"/>
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>`).join('\n')}
    </visual_scene>
  </library_visual_scenes>
  <scene>
    <instance_visual_scene url="#Scene"/>
  </scene>
</COLLADA>`

  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.[^.]+$/, '') + '.dae'
  a.click()
  URL.revokeObjectURL(url)
}
