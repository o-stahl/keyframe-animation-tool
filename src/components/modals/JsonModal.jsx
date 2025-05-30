import React, { useMemo } from 'react';
import { useAnimation } from '../../contexts/AnimationContext';
import { generateAnimationJson } from '../../utils/animationHelpers';
import { useKeyframes } from '../../hooks/useKeyframes';

const JsonModal = ({ show, onClose }) => {
  const { animationName, animationDuration, keyFrames, isSceneReady } = useAnimation();
  const { totalKeyframeCount } = useKeyframes();

  const displayJsonString = useMemo(() => {
    if (isSceneReady && totalKeyframeCount > 0) {
      return generateAnimationJson(animationName, animationDuration, keyFrames);
    } else if (isSceneReady && totalKeyframeCount === 0) {
      return '// No keyframes have been set for the current animation.';
    } else {
      return '// Load a model and create keyframes to see JSON data.';
    }
  }, [keyFrames, animationName, animationDuration, isSceneReady, totalKeyframeCount]);

  const handleCopyJson = () => {
    if (!isSceneReady || totalKeyframeCount === 0) {
      alert("No JSON data to copy.");
      return;
    }
    navigator.clipboard.writeText(displayJsonString)
      .then(() => alert("Animation JSON copied to clipboard!"))
      .catch(err => {
        console.error("Failed to copy JSON:", err);
        alert("Failed to copy JSON. See console for details.");
      });
  };

  const handleExportJson = () => {
    if (!isSceneReady) { 
      alert("Load a model first."); 
      return; 
    }
    if (totalKeyframeCount === 0) { 
      alert("No keyframes to export."); 
      return; 
    }
    const blob = new Blob([displayJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `${animationName.replace(/\s+/g, '_') || 'animation'}.json`;
    a.click(); 
    URL.revokeObjectURL(url); 
    a.remove();
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content large">
        <h4>Animation JSON</h4>
        <div className="json-controls">
          <button 
            className="button secondary" 
            onClick={handleCopyJson}
            disabled={!isSceneReady || totalKeyframeCount === 0}
          >
            Copy
          </button>
          <button 
            className="button secondary" 
            onClick={handleExportJson}
            disabled={!isSceneReady || totalKeyframeCount === 0}
          >
            Download
          </button>
        </div>
        <pre className="json-display-modal">{displayJsonString}</pre>
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default JsonModal;