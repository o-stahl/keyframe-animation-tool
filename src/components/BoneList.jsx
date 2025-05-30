import React, { useCallback } from 'react';
import { useAnimation } from '../contexts/AnimationContext';

const BoneList = () => {
  const {
    bones,
    selectedBoneName,
    setSelectedBoneName,
    isSceneReady,
    isLoadingModel,
    isGizmoDraggingRef
  } = useAnimation();

  const handleBoneSelect = useCallback((boneName) => {
    if (!isGizmoDraggingRef.current) {
      setSelectedBoneName(boneName);
    }
  }, [setSelectedBoneName, isGizmoDraggingRef]);

  return (
    <div className="section">
      <h4>Bones</h4>
      <div className="bone-list">
        {isSceneReady && bones.map(bone => (
          <div 
            key={bone.name} 
            onClick={() => handleBoneSelect(bone.name)}
            className={`bone-item ${selectedBoneName === bone.name ? 'selected' : ''}`}
          >
            <svg className="bone-icon" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="2"/>
              <circle cx="13" cy="8" r="2"/>
              <rect x="3" y="7" width="10" height="2"/>
            </svg>
            {bone.name}
          </div>
        ))}
        {(!isSceneReady && !isLoadingModel) && 
          <div className="bone-item">Load a model to see bones.</div>
        }
        {isLoadingModel && 
          <div className="bone-item">Loading bones...</div>
        }
      </div>
    </div>
  );
};

export default BoneList;