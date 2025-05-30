import { useCallback, useMemo } from 'react';
import { useAnimation } from '../contexts/AnimationContext';
import { 
  eulerToQuaternion, 
  validatePosition, 
  findKeyframeAtTime,
  insertOrUpdateKeyframe,
  removeKeyframeAtTime 
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
    livePose 
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
    const rotation = eulerToQuaternion(boneRotationUI);
    
    let position;
    const bone = sceneManagerRef.current.getBoneByName(selectedBoneName);
    if (bone && bone.userData.initialLocalPosition) {
        position = {
            x: bone.userData.initialLocalPosition.x,
            y: bone.userData.initialLocalPosition.y,
            z: bone.userData.initialLocalPosition.z,
        };
    } else if (livePose[selectedBoneName] && livePose[selectedBoneName].position) {
        position = { ...livePose[selectedBoneName].position };
    } else {
        position = { x: 0, y: 0, z: 0 };
    }
    position = validatePosition(position);


    const newKeyframe = { time, position, rotation };

    setKeyFrames(prev => {
      const track = prev[selectedBoneName] || [];
      const updatedTrack = insertOrUpdateKeyframe(track, newKeyframe);
      return { ...prev, [selectedBoneName]: updatedTrack };
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
    livePose
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