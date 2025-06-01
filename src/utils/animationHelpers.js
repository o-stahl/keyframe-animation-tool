import * as THREE from 'three';

export const generateAnimationJson = (animationName, animationDuration, keyFrames) => {
  const animationClipData = {
    name: animationName,
    duration: animationDuration,
    tracks: [],
  };
  
  for (const boneName in keyFrames) {
    const trackData = keyFrames[boneName];
    if (trackData && trackData.length > 0) {
      const rotTimes = [], rotValues = [], posTimes = [], posValues = [];
      
      trackData.forEach(kf => {
        if (kf.rotation && 
            typeof kf.rotation.x === 'number' && typeof kf.rotation.y === 'number' && 
            typeof kf.rotation.z === 'number' && typeof kf.rotation.w === 'number') { 
          rotTimes.push(kf.time); 
          rotValues.push(kf.rotation.x, kf.rotation.y, kf.rotation.z, kf.rotation.w); 
        }
        if (kf.position &&
            typeof kf.position.x === 'number' &&
            typeof kf.position.y === 'number' &&
            typeof kf.position.z === 'number') { 
          posTimes.push(kf.time); 
          posValues.push(kf.position.x, kf.position.y, kf.position.z); 
        }
      });
      
      if (rotValues.length > 0) {
        animationClipData.tracks.push({ 
          name: `${boneName}.quaternion`, 
          type: 'quaternion', 
          times: rotTimes, 
          values: rotValues 
        });
      }
      if (posValues.length > 0) {
        animationClipData.tracks.push({ 
          name: `${boneName}.position`, 
          type: 'vector', 
          times: posTimes, 
          values: posValues 
        });
      }
    }
  }
  
  return JSON.stringify(animationClipData, null, 2);
};

export const eulerToQuaternion = (eulerDegrees) => {
  const eulerXRad = (typeof eulerDegrees.x === 'number' && !isNaN(eulerDegrees.x) ? eulerDegrees.x : 0) * Math.PI / 180;
  const eulerYRad = (typeof eulerDegrees.y === 'number' && !isNaN(eulerDegrees.y) ? eulerDegrees.y : 0) * Math.PI / 180;
  const eulerZRad = (typeof eulerDegrees.z === 'number' && !isNaN(eulerDegrees.z) ? eulerDegrees.z : 0) * Math.PI / 180;
  
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(eulerXRad, eulerYRad, eulerZRad, 'XYZ')
  );
  
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w
  };
};

export const validatePosition = (position) => {
  return {
    x: typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 0,
    y: typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 0,
    z: typeof position?.z === 'number' && !isNaN(position.z) ? position.z : 0,
  };
};

export const findKeyframeAtTime = (keyframes, time, tolerance = 0.0001) => {
  if (!keyframes || !Array.isArray(keyframes)) return null;
  return keyframes.find(kf => Math.abs(kf.time - time) < tolerance);
};

export const insertOrUpdateKeyframe = (track, newKeyframe, tolerance = 0.0001) => {
  const newTrack = track ? [...track] : [];
  const existingIndex = newTrack.findIndex(kf => Math.abs(kf.time - newKeyframe.time) < tolerance);
  
  if (existingIndex > -1) {
    newTrack[existingIndex] = { ...newTrack[existingIndex], ...newKeyframe };
  } else {
    newTrack.push(newKeyframe);
  }
  
  newTrack.sort((a, b) => a.time - b.time);
  return newTrack;
};

export const removeKeyframeAtTime = (track, time, tolerance = 0.0001) => {
  if (!track) return [];
  return track.filter(kf => Math.abs(kf.time - time) > tolerance);
};

export const createThreeAnimationTracks = (keyFrames, sceneManager) => {
  const tracks = [];
  
  for (const boneName in keyFrames) {
    const boneTrackData = keyFrames[boneName];
    const bone = sceneManager.getBoneByName(boneName); 
    
    if (bone && boneTrackData && boneTrackData.length > 0) {
      const rotTimes = [], rotValues = [], posTimes = [], posValues = [];
      
      boneTrackData.forEach(kf => {
          if (kf.rotation) {
            rotTimes.push(kf.time);
            rotValues.push(kf.rotation.x, kf.rotation.y, kf.rotation.z, kf.rotation.w);
          }
          if (kf.position) {
            posTimes.push(kf.time);
            posValues.push(kf.position.x, kf.position.y, kf.position.z);
          }
      });
      
      if (rotValues.length > 0) {
        const sortedRotIndices = rotTimes.map((_t, i) => i).sort((a, b) => rotTimes[a] - rotTimes[b]);
        const sortedRotTimes = sortedRotIndices.map(i => rotTimes[i]);
        const sortedRotValues = [];
        sortedRotIndices.forEach(i => sortedRotValues.push(rotValues[i*4], rotValues[i*4+1], rotValues[i*4+2], rotValues[i*4+3]));
        tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, sortedRotTimes, sortedRotValues));
      }
      
      if (posValues.length > 0) {
        const sortedPosIndices = posTimes.map((_t, i) => i).sort((a, b) => posTimes[a] - posTimes[b]);
        const sortedPosTimes = sortedPosIndices.map(i => posTimes[i]);
        const sortedPosValues = [];
        sortedPosIndices.forEach(i => sortedPosValues.push(posValues[i*3], posValues[i*3+1], posValues[i*3+2]));
        tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, sortedPosTimes, sortedPosValues));
      }
    }
  }
  
  return tracks;
};

export const validateImportedJson = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error("Invalid JSON: Not an object");
  }
  
  if (typeof data.name !== 'string') {
    throw new Error("Invalid JSON: Missing or invalid 'name' field");
  }
  
  if (typeof data.duration !== 'number' || data.duration <= 0) {
    throw new Error("Invalid JSON: Missing or invalid 'duration' field");
  }
  
  if (!Array.isArray(data.tracks)) {
    throw new Error("Invalid JSON: Missing or invalid 'tracks' array");
  }
  
  return true;
};

export const parseImportedTracks = (tracks, bones, sceneManager) => {
  const newKeyFrames = {};
  const skippedBones = [];
  
  tracks.forEach(track => {
    const boneNameMatch = track.name.match(/^([a-zA-Z0-9_:]+)\.(quaternion|position)$/);
    if (!boneNameMatch) {
      return;
    }
    
    const boneName = boneNameMatch[1];
    const propertyType = boneNameMatch[2];
    
    if (!bones.find(b => b.name === boneName)) {
      if (!skippedBones.includes(boneName)) {
        skippedBones.push(boneName);
      }
      return;
    }
    
    if (!newKeyFrames[boneName]) {
      newKeyFrames[boneName] = [];
    }
    
    const valuesPerKey = (propertyType === 'quaternion') ? 4 : 3;
    if (!Array.isArray(track.values) || !Array.isArray(track.times) || track.values.length !== track.times.length * valuesPerKey) {
      console.warn(`Skipping track ${track.name} (times/values length mismatch or invalid structure).`);
      return;
    }
    
    for (let i = 0; i < track.times.length; i++) {
      const time = parseFloat(track.times[i].toFixed(4));
      let kf = newKeyFrames[boneName].find(k => Math.abs(k.time - time) < 0.0001);
      
      if (!kf) {
        kf = { time };
        const initialBoneData = sceneManager?.getBoneByName(boneName)?.userData;
        
        kf.position = initialBoneData?.initialLocalPosition 
                      ? { ...initialBoneData.initialLocalPosition } 
                      : { x: 0, y: 0, z: 0 };
        kf.rotation = initialBoneData?.initialLocalQuaternion 
                      ? { ...initialBoneData.initialLocalQuaternion } 
                      : { x: 0, y: 0, z: 0, w: 1 };
        newKeyFrames[boneName].push(kf);
      }
      
      if (propertyType === 'quaternion') {
        kf.rotation = {
          x: track.values[i * 4],
          y: track.values[i * 4 + 1],
          z: track.values[i * 4 + 2],
          w: track.values[i * 4 + 3]
        };
      } else if (propertyType === 'position') {
        kf.position = {
          x: track.values[i * 3],
          y: track.values[i * 3 + 1],
          z: track.values[i * 3 + 2]
        };
      }
    }
  });
  
  for (const bn in newKeyFrames) {
    newKeyFrames[bn].sort((a, b) => a.time - b.time);
  }
  
  return { keyFrames: newKeyFrames, skippedBones };
};

export function parseAnimationClipToKATKeyframes(animationClip, availableBonesInKAT, sceneManager) {
  const tempKeyframesStore = {}; 
  const skippedBones = [];
  const { tracks, duration, name: clipName } = animationClip;

  tracks.forEach(track => {
    const trackNameParts = track.name.match(/^(.+?)\.(position|quaternion|scale)$/);
    if (!trackNameParts) {
      return;
    }

    const boneName = trackNameParts[1];
    const property = trackNameParts[2];

    const boneExistsInKAT = availableBonesInKAT.some(b => b.name === boneName);
    if (!boneExistsInKAT) {
      if (!skippedBones.includes(boneName)) {
        skippedBones.push(boneName);
      }
      return;
    }

    if (property === 'scale') {
        return;
    }

    if (!tempKeyframesStore[boneName]) {
      tempKeyframesStore[boneName] = {};
    }

    const times = track.times; 
    const values = track.values; 
    
    let valueSize = 0;
    if (property === 'position') valueSize = 3;
    else if (property === 'quaternion') valueSize = 4;
    else {
        return;
    }

    const timesIsArrayOrTypedArray = Array.isArray(times) || (typeof times?.length === 'number' && times?.buffer instanceof ArrayBuffer);
    const valuesIsArrayOrTypedArray = Array.isArray(values) || (typeof values?.length === 'number' && values?.buffer instanceof ArrayBuffer);
    const numKeyframesInTrack = times?.length || 0;
    const expectedValuesLength = numKeyframesInTrack * valueSize;
    const actualValuesLength = values?.length || 0;

    if (!timesIsArrayOrTypedArray || !valuesIsArrayOrTypedArray || actualValuesLength !== expectedValuesLength || numKeyframesInTrack === 0) {
      console.warn(`[KAT Animation Import] Skipping track '${track.name}': Data structure error or empty track.`);
      return;
    }
    
    for (let i = 0; i < numKeyframesInTrack; i++) {
      const time = parseFloat(times[i].toFixed(4));
      const timeKey = time.toString(); 
      
      if (!tempKeyframesStore[boneName][timeKey]) {
        const initialBoneData = sceneManager?.getBoneByName(boneName)?.userData;
        let initialPos = { x: 0, y: 0, z: 0 };
        let initialRot = { x: 0, y: 0, z: 0, w: 1 };

        if (initialBoneData) {
            if (initialBoneData.initialLocalPosition) {
                initialPos = { ...initialBoneData.initialLocalPosition };
            }
            if (initialBoneData.initialLocalQuaternion) {
                initialRot = { ...initialBoneData.initialLocalQuaternion };
            }
        }
        tempKeyframesStore[boneName][timeKey] = {
          time: time,
          position: initialPos,
          rotation: initialRot
        };
      }
      
      const kf = tempKeyframesStore[boneName][timeKey];

      if (property === 'position') {
        kf.position = { x: values[i * 3], y: values[i * 3 + 1], z: values[i * 3 + 2] };
      } else if (property === 'quaternion') {
        kf.rotation = { x: values[i * 4], y: values[i * 4 + 1], z: values[i * 4 + 2], w: values[i * 4 + 3] };
      }
    }
  });

  const newKeyFramesArray = {};
  for (const boneName in tempKeyframesStore) {
    newKeyFramesArray[boneName] = Object.values(tempKeyframesStore[boneName]).sort((a, b) => a.time - b.time);
  }
  
  if (Object.keys(newKeyFramesArray).length === 0 && tracks.length > 0 && skippedBones.length === tracks.map(t => t.name.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i).length) {
    console.warn("[KAT Animation Import] No compatible animation tracks found for the current model's skeleton after processing all tracks.");
  } else if (skippedBones.length > 0) {
    console.warn(`[KAT Animation Import] Some animation tracks were skipped because the following bones were not found in the current model: ${skippedBones.join(', ')}`);
  }


  return {
    animationName: clipName,
    animationDuration: duration,
    keyFrames: newKeyFramesArray,
    skippedBones
  };
}

export const getQuaternionAngleDifference = (q1, q2) => {
  const tq1 = new THREE.Quaternion(
    (typeof q1?.x === 'number' && !isNaN(q1.x)) ? q1.x : 0,
    (typeof q1?.y === 'number' && !isNaN(q1.y)) ? q1.y : 0,
    (typeof q1?.z === 'number' && !isNaN(q1.z)) ? q1.z : 0,
    (typeof q1?.w === 'number' && !isNaN(q1.w)) ? q1.w : 1
  );
  const tq2 = new THREE.Quaternion(
    (typeof q2?.x === 'number' && !isNaN(q2.x)) ? q2.x : 0,
    (typeof q2?.y === 'number' && !isNaN(q2.y)) ? q2.y : 0,
    (typeof q2?.z === 'number' && !isNaN(q2.z)) ? q2.z : 0,
    (typeof q2?.w === 'number' && !isNaN(q2.w)) ? q2.w : 1
  );
  return tq1.angleTo(tq2);
};