import { useCallback } from 'react';
import { useAnimation } from '../contexts/AnimationContext';
import { useKeyframes } from '../hooks/useKeyframes';
import { eulerToQuaternion } from '../utils/animationHelpers';

const TransformPanel = () => {
  const {
    selectedBoneName,
    isSceneReady,
    isPlaying,
    boneRotationUI,
    setBoneRotationUI,
    bonePositionUI,
    setLivePose,
    sceneManagerRef
  } = useAnimation();
  
  const { 
    setKeyframeFromUI, 
    deleteKeyframeAtCurrentTime,
    hasKeyframeAtCurrentTime,
    selectedBoneKeyframeCount 
  } = useKeyframes();

  const handleRotationUIChange = useCallback((axis, value) => {
    if (!isSceneReady || isPlaying || !selectedBoneName) return;
    const newRotUI = { ...boneRotationUI, [axis]: parseFloat(value) || 0 };
    setBoneRotationUI(newRotUI);
    
    const quaternion = eulerToQuaternion(newRotUI);
    
    setLivePose(prev => {
      const currentBoneDataInLivePose = prev[selectedBoneName] || {};
      const existingPosition = currentBoneDataInLivePose.position || 
                               sceneManagerRef.current?.boneMap.get(selectedBoneName)?.userData.initialLocalPosition || 
                               {x:0,y:0,z:0};
      return {
        ...prev,
        [selectedBoneName]: { 
          position: { ...existingPosition }, 
          quaternion
        }
      };
    });
  }, [isSceneReady, isPlaying, selectedBoneName, boneRotationUI, setBoneRotationUI, setLivePose, sceneManagerRef]);


  if (!selectedBoneName || !isSceneReady) return null;

  return (
    <>
      <div className="section">
        <h4>Transform</h4>
        <div className="transform-section">
          <div className="transform-label">POSITION (Read-only)</div>
          <div className="transform-grid">
            <div></div>
            <div className="axis-label x">X</div>
            <div className="axis-label y">Y</div>
            <div className="axis-label z">Z</div>
            
            <div className="transform-label-small">Local</div>
            <input 
              className="transform-input" 
              type="number" 
              value={bonePositionUI.x.toFixed(3)} 
              step="0.01" 
              disabled={true}
            />
            <input 
              className="transform-input" 
              type="number" 
              value={bonePositionUI.y.toFixed(3)} 
              step="0.01" 
              disabled={true}
            />
            <input 
              className="transform-input" 
              type="number" 
              value={bonePositionUI.z.toFixed(3)} 
              step="0.01" 
              disabled={true}
            />
          </div>
        </div>

        <div className="transform-section">
          <div className="transform-label">ROTATION (°)</div>
          <div className="transform-grid">
            <div></div>
            <div className="axis-label x">X</div>
            <div className="axis-label y">Y</div>
            <div className="axis-label z">Z</div>
            
            <div className="transform-label-small">Euler</div>
            <input 
              className="transform-input" 
              type="number" 
              value={boneRotationUI.x.toFixed(2)} 
              step="1" 
              onChange={(e) => handleRotationUIChange('x', e.target.value)} 
              disabled={isPlaying}
            />
            <input 
              className="transform-input" 
              type="number" 
              value={boneRotationUI.y.toFixed(2)} 
              step="1" 
              onChange={(e) => handleRotationUIChange('y', e.target.value)} 
              disabled={isPlaying}
            />
            <input 
              className="transform-input" 
              type="number" 
              value={boneRotationUI.z.toFixed(2)} 
              step="1" 
              onChange={(e) => handleRotationUIChange('z', e.target.value)} 
              disabled={isPlaying}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h4>Keyframes {selectedBoneKeyframeCount > 0 && `(${selectedBoneKeyframeCount})`}</h4>
        <div className="button-group">
          <button 
            className="button" 
            onClick={setKeyframeFromUI}
            disabled={!selectedBoneName || !isSceneReady || isPlaying}
          >
            {hasKeyframeAtCurrentTime ? 'Update Key' : 'Set Key'}
          </button>
          <button 
            className="button secondary" 
            onClick={deleteKeyframeAtCurrentTime}
            disabled={!selectedBoneName || !isSceneReady || isPlaying || !hasKeyframeAtCurrentTime}
          >
            Delete Key
          </button>
        </div>
      </div>
    </>
  );
};

export default TransformPanel;