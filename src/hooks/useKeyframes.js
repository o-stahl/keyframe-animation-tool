import { useCallback, useMemo } from 'react';
import { useAnimation } from '../contexts/AnimationContext';
import { 
  eulerToQuaternion, 
  validatePosition, 
  findKeyframeAtTime,
  insertOrUpdateKeyframe,
  removeKeyframeAtTime,
  getQuaternionAngleDifference
} from '../utils/animationHelpers';

export const useKeyframes = () => {
  const {
    selectedBoneName,
    isSceneReady,
    isPlaying,
    currentTime,
    boneRotationUI,
    keyFrames,
    setKeyFrames,
    sceneManagerRef,
    livePose,
    bones
  } = useAnimation();

  const hasKeyframeAtCurrentTime = useMemo(() => {
    if (!selectedBoneName || !keyFrames[selectedBoneName]) return false;
    return !!findKeyframeAtTime(keyFrames[selectedBoneName], currentTime);
  }, [selectedBoneName, keyFrames, currentTime]);

  const selectedBoneKeyframeCount = useMemo(() => {
    if (!selectedBoneName || !keyFrames[selectedBoneName]) return 0;
    return keyFrames[selectedBoneName].length;
  }, [selectedBoneName, keyFrames]);

  const totalKeyframeCount = useMemo(() => {
    return Object.values(keyFrames).reduce((total, track) => {
      return total + (track ? track.length : 0);
    }, 0);
  }, [keyFrames]);

  const setKeyframeFromUI = useCallback(() => {
    if (!selectedBoneName || !isSceneReady || isPlaying || !sceneManagerRef.current) return false;

    const time = parseFloat(currentTime.toFixed(4));
    const rotationThreshold = 0.001; // Radians, approx 0.05 degrees.

    setKeyFrames(prevKeyFrames => {
      const newKeyFramesData = { ...prevKeyFrames };

      const selectedBoneRotation = eulerToQuaternion(boneRotationUI);
      let selectedBonePosition;
      const selectedBoneSceneObject = sceneManagerRef.current.getBoneByName(selectedBoneName);

      if (livePose[selectedBoneName] && livePose[selectedBoneName].position) {
          selectedBonePosition = { ...livePose[selectedBoneName].position };
      } else if (selectedBoneSceneObject && selectedBoneSceneObject.userData.initialLocalPosition) {
          selectedBonePosition = { ...selectedBoneSceneObject.userData.initialLocalPosition };
      } else {
          selectedBonePosition = { x: 0, y: 0, z: 0 };
      }
      selectedBonePosition = validatePosition(selectedBonePosition);

      const selectedBoneKeyframe = { time, position: selectedBonePosition, rotation: selectedBoneRotation };
      const selectedBoneTrack = newKeyFramesData[selectedBoneName] || [];
      newKeyFramesData[selectedBoneName] = insertOrUpdateKeyframe(selectedBoneTrack, selectedBoneKeyframe);

      bones.forEach(boneInfo => {
        const otherBoneName = boneInfo.name;
        if (otherBoneName === selectedBoneName) return;

        const currentOtherBoneLiveTransform = livePose[otherBoneName];
        if (!currentOtherBoneLiveTransform || !currentOtherBoneLiveTransform.quaternion) {
            return;
        }
        
        const interpolatedPose = sceneManagerRef.current.interpolatePoseAtTimeForBone(
          otherBoneName,
          prevKeyFrames,
          time
        );

        const angleDifference = getQuaternionAngleDifference(
            currentOtherBoneLiveTransform.quaternion,
            interpolatedPose.quaternion
        );
        
        if (angleDifference > rotationThreshold) {
          let otherBonePositionToKey;
          const otherBoneSceneObject = sceneManagerRef.current.getBoneByName(otherBoneName);
          
          if (currentOtherBoneLiveTransform.position) {
              otherBonePositionToKey = { ...currentOtherBoneLiveTransform.position };
          } else if (otherBoneSceneObject && otherBoneSceneObject.userData.initialLocalPosition) {
              otherBonePositionToKey = { ...otherBoneSceneObject.userData.initialLocalPosition };
          } else {
              otherBonePositionToKey = { x: 0, y: 0, z: 0 };
          }
          otherBonePositionToKey = validatePosition(otherBonePositionToKey);

          const otherBoneKeyframe = {
            time,
            position: otherBonePositionToKey, 
            rotation: { ...currentOtherBoneLiveTransform.quaternion }
          };
          const otherBoneTrack = newKeyFramesData[otherBoneName] || [];
          newKeyFramesData[otherBoneName] = insertOrUpdateKeyframe(otherBoneTrack, otherBoneKeyframe);
        }
      });
      return newKeyFramesData;
    });

    return true;
  }, [
    selectedBoneName, 
    isSceneReady, 
    isPlaying, 
    currentTime, 
    boneRotationUI, 
    setKeyFrames, 
    sceneManagerRef,
    livePose,
    bones
  ]);

  const deleteKeyframeAtCurrentTime = useCallback(() => {
    if (!selectedBoneName || !isSceneReady || isPlaying) return false;
    
    const time = parseFloat(currentTime.toFixed(4));
    
    setKeyFrames(prev => {
      if (!prev[selectedBoneName]) return prev;
      
      const updatedTrack = removeKeyframeAtTime(prev[selectedBoneName], time);
      
      if (updatedTrack.length === 0) {
        const newKFs = { ...prev };
        delete newKFs[selectedBoneName];
        return newKFs;
      }
      
      return { ...prev, [selectedBoneName]: updatedTrack };
    });

    return true;
  }, [selectedBoneName, isSceneReady, isPlaying, currentTime, setKeyFrames]);

  return {
    hasKeyframeAtCurrentTime,
    selectedBoneKeyframeCount,
    totalKeyframeCount,
    setKeyframeFromUI,
    deleteKeyframeAtCurrentTime,
  };
};