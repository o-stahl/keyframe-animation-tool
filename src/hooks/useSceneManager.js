import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useAnimation } from '../contexts/AnimationContext';
import SceneManager from '../core/SceneManager'; 

const TIMELINE_MARKER_DEBOUNCE_TIME = 50;
const GIZMO_UPDATE_DEBOUNCE_TIME = 30;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => { 
      timeout = null; 
      func.apply(context, args); 
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const useSceneManager = (viewportRef) => {
  const {
    sceneManagerRef,
    isGizmoDraggingRef,
    setCurrentTime,
    setLivePose,
    isSceneReady,
    selectedBoneName,
    isPlaying,
    bones,
    keyFrames,
    currentTime,
    livePose,
    setBoneRotationUI,
    setBonePositionUI,
    resetAllStateForNewModel,
    setIsLoadingModel,
    setIsSceneReady,
    setBones,
    setSelectedBoneName
  } = useAnimation();

  const updateUIDisplayForBone = useCallback((boneName, currentLivePose) => {
    if (boneName && currentLivePose && currentLivePose[boneName]) {
      const boneData = currentLivePose[boneName];
      if (boneData.quaternion && 
          typeof boneData.quaternion.x === 'number' && !isNaN(boneData.quaternion.x) &&
          typeof boneData.quaternion.y === 'number' && !isNaN(boneData.quaternion.y) &&
          typeof boneData.quaternion.z === 'number' && !isNaN(boneData.quaternion.z) &&
          typeof boneData.quaternion.w === 'number' && !isNaN(boneData.quaternion.w)) {
        const euler = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion(boneData.quaternion.x, boneData.quaternion.y, boneData.quaternion.z, boneData.quaternion.w),
          'XYZ'
        );
        setBoneRotationUI({
          x: euler.x * 180 / Math.PI,
          y: euler.y * 180 / Math.PI,
          z: euler.z * 180 / Math.PI,
        });
      } else {
        setBoneRotationUI({ x: 0, y: 0, z: 0 });
      }
      if (boneData.position &&
          typeof boneData.position.x === 'number' && !isNaN(boneData.position.x) &&
          typeof boneData.position.y === 'number' && !isNaN(boneData.position.y) &&
          typeof boneData.position.z === 'number' && !isNaN(boneData.position.z)) {
        setBonePositionUI({ ...boneData.position });
      } else {
        setBonePositionUI({ x: 0, y: 0, z: 0 });
      }
    } else {
      setBoneRotationUI({ x: 0, y: 0, z: 0 });
      setBonePositionUI({ x: 0, y: 0, z: 0 });
    }
  }, [setBoneRotationUI, setBonePositionUI]);

  const handleTransformChangeByGizmo = useCallback((boneName, _localPosition, localQuaternion) => {
    setLivePose(prevLivePose => {
      const currentBoneData = prevLivePose[boneName] || {};
      let currentPosition;
      if (currentBoneData.position) {
        currentPosition = { ...currentBoneData.position };
      } else if (sceneManagerRef.current) {
        const bone = sceneManagerRef.current.getBoneByName(boneName);
        if (bone && bone.userData.initialLocalPosition) {
          currentPosition = { ...bone.userData.initialLocalPosition };
        } else {
          currentPosition = { x: 0, y: 0, z: 0 }; 
        }
      } else {
        currentPosition = { x: 0, y: 0, z: 0 }; 
      }
      
      const newBonePose = {
        position: currentPosition, 
        quaternion: { 
          x: typeof localQuaternion.x === 'number' ? localQuaternion.x : 0, 
          y: typeof localQuaternion.y === 'number' ? localQuaternion.y : 0, 
          z: typeof localQuaternion.z === 'number' ? localQuaternion.z : 0, 
          w: typeof localQuaternion.w === 'number' ? localQuaternion.w : 1 
        }
      };
      return { ...prevLivePose, [boneName]: newBonePose };
    });
  }, [setLivePose, sceneManagerRef]); 

  const debouncedHandleTransformChangeByGizmo = useCallback(
    debounce(handleTransformChangeByGizmo, GIZMO_UPDATE_DEBOUNCE_TIME), 
    [handleTransformChangeByGizmo]
  );

  const handleGizmoDraggingChanged = useCallback((isDragging) => {
    isGizmoDraggingRef.current = isDragging;
  }, [isGizmoDraggingRef]);

  const handleBoneSelect = useCallback((boneName) => { 
    setSelectedBoneName(boneName); 
  }, [setSelectedBoneName]);

  const handleLoadModel = useCallback((modelFile) => {
    if (!sceneManagerRef.current || !modelFile) return;
    setIsLoadingModel(true); 
    setIsSceneReady(false); 
    resetAllStateForNewModel();
    const currentSM = sceneManagerRef.current;
    
    const objectUrl = URL.createObjectURL(modelFile);
    currentSM.loadModel(objectUrl)
      .then((initialBoneData) => { 
        if (sceneManagerRef.current === currentSM) { 
          const currentBonesList = currentSM.getBones();
          setBones(currentBonesList); 
          setLivePose(initialBoneData || {}); 
          setIsSceneReady(true); 
          setTimeout(() => {
            if (sceneManagerRef.current && typeof sceneManagerRef.current.onWindowResize === 'function') {
              sceneManagerRef.current.onWindowResize();
            }
          }, 0);
          if (currentBonesList.length > 0) {
            setTimeout(() => {
              if (sceneManagerRef.current === currentSM) handleBoneSelect(currentBonesList[0].name);
            }, 50); 
          }
        }
      })
      .catch(error => console.error("Failed to load model:", error))
      .finally(() => {
        setIsLoadingModel(false);
        URL.revokeObjectURL(objectUrl);
      });
  }, [sceneManagerRef, setIsLoadingModel, setIsSceneReady, resetAllStateForNewModel, setBones, setLivePose, handleBoneSelect]);

  useEffect(() => {
    if (viewportRef.current) {
      if (!sceneManagerRef.current) {
        const sm = new SceneManager(viewportRef.current); 
        sceneManagerRef.current = sm; 
        sm.setOnBoneTransformChangeByGizmo(debouncedHandleTransformChangeByGizmo);
        sm.setOnGizmoDraggingChangedCallback(handleGizmoDraggingChanged); 
        sm.setOnBoneClickCallback(handleBoneSelect);
        sm.setOnTimeUpdate((time) => {
          if (!isGizmoDraggingRef.current) {
            setCurrentTime(parseFloat(time.toFixed(4)));
          }
        });
        
        setTimeout(() => {
          if (sceneManagerRef.current && typeof sceneManagerRef.current.onWindowResize === 'function') {
            sceneManagerRef.current.onWindowResize();
          }
        }, 100);
      }
    }
    return () => {
      if (sceneManagerRef.current) { 
        sceneManagerRef.current.cleanup(); 
        sceneManagerRef.current = null; 
      }
      setIsSceneReady(false); 
    };
  }, []); 

  useEffect(() => {
    if (sceneManagerRef.current && isSceneReady) {
      if (selectedBoneName && !isPlaying) { 
        sceneManagerRef.current.attachGizmo(selectedBoneName); 
      } else {
        sceneManagerRef.current.detachGizmo();
      }
      sceneManagerRef.current.highlightSelectedBoneMarker(selectedBoneName);
    }
  }, [selectedBoneName, isSceneReady, isPlaying, sceneManagerRef]);

  useEffect(() => {
      if (sceneManagerRef.current && sceneManagerRef.current.boneMarkersGroup) {
          sceneManagerRef.current.boneMarkersGroup.visible = !isPlaying && isSceneReady;
      }
  }, [isPlaying, isSceneReady, sceneManagerRef]);


  useEffect(() => {
    if (!isSceneReady || isPlaying || isGizmoDraggingRef.current || !sceneManagerRef.current || bones.length === 0) {
      return;
    }
    
    const newCalculatedPose = {};
    bones.forEach(boneInfo => {
      const boneName = boneInfo.name;
      const interpolatedTransform = sceneManagerRef.current.interpolatePoseAtTimeForBone(boneName, keyFrames, currentTime);
      
      if (interpolatedTransform && interpolatedTransform.position && interpolatedTransform.quaternion &&
          Object.values(interpolatedTransform.position).every(v => typeof v === 'number' && !isNaN(v)) &&
          Object.values(interpolatedTransform.quaternion).every(v => typeof v === 'number' && !isNaN(v)) ) {
        newCalculatedPose[boneName] = interpolatedTransform;
      } else {
        const initialData = sceneManagerRef.current?.boneMap.get(boneName)?.userData;
        newCalculatedPose[boneName] = { 
          position: initialData?.initialLocalPosition ? {...initialData.initialLocalPosition} : {x:0,y:0,z:0}, 
          quaternion: initialData?.initialLocalQuaternion ? {...initialData.initialLocalQuaternion} : {x:0,y:0,z:0,w:1}
        };
      }
    });
    
    setLivePose(prevLivePose => {
      if (JSON.stringify(prevLivePose) !== JSON.stringify(newCalculatedPose)) {
        return newCalculatedPose;
      }
      return prevLivePose;
    });
  }, [currentTime, keyFrames, isSceneReady, isPlaying, bones, sceneManagerRef]); 

  useEffect(() => {
    if (sceneManagerRef.current && isSceneReady && Object.keys(livePose).length > 0 && 
        !isPlaying && !isGizmoDraggingRef.current) {
      sceneManagerRef.current.applyPoseFromData(livePose);
    }
  }, [livePose, isSceneReady, isPlaying, sceneManagerRef]); 

  useEffect(() => {
    if (isSceneReady && selectedBoneName && livePose[selectedBoneName]) {
      updateUIDisplayForBone(selectedBoneName, livePose);
    } else if (isSceneReady && selectedBoneName && !livePose[selectedBoneName] && sceneManagerRef.current) {
      const bone = sceneManagerRef.current.getBoneByName(selectedBoneName);
      if (bone && bone.userData.initialLocalPosition && bone.userData.initialLocalQuaternion) {
        const initialDataForBone = {
          [selectedBoneName]: {
            position: {...bone.userData.initialLocalPosition},
            quaternion: {...bone.userData.initialLocalQuaternion}
          }
        };
        updateUIDisplayForBone(selectedBoneName, initialDataForBone);
      }
    }
  }, [selectedBoneName, livePose, isSceneReady, updateUIDisplayForBone, sceneManagerRef]); 

  return {
    handleLoadModel
  };
};