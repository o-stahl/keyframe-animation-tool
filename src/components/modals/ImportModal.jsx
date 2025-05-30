import React, { useState, useRef } from 'react';
import { useAnimation } from '../../contexts/AnimationContext';
import { validateImportedJson, parseImportedTracks } from '../../utils/animationHelpers';

const ImportModal = ({ show, onClose }) => {
  const [jsonToImport, setJsonToImport] = useState('');
  const importJsonTextAreaRef = useRef(null);
  
  const {
    bones,
    setAnimationName,
    setAnimationDuration,
    setKeyFrames,
    setCurrentTime,
    setLivePose,
    sceneManagerRef
  } = useAnimation();

  const processImportedJson = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate JSON structure
      validateImportedJson(data);
      
      // Parse tracks into keyframe format
      const { keyFrames: newKeyFrames, skippedBones } = parseImportedTracks(
        data.tracks, 
        bones, 
        sceneManagerRef.current
      );
      
      // Warn about skipped bones if any
      if (skippedBones.length > 0) {
        console.warn(`Skipped bones not in current model: ${skippedBones.join(', ')}`);
      }
      
      setAnimationName(data.name); 
      setAnimationDuration(data.duration);
      setKeyFrames(newKeyFrames);
      
      const timeToSet = 0;
      setCurrentTime(timeToSet);
      
      // Set initial pose from imported animation
      const initialPoseFromImport = {};
      bones.forEach(bInfo => {
        const boneName = bInfo.name;
        if(sceneManagerRef.current) {
          const interpolated = sceneManagerRef.current.interpolatePoseAtTimeForBone(
            boneName, 
            newKeyFrames, 
            timeToSet
          );
          if (interpolated) {
            initialPoseFromImport[boneName] = interpolated;
          } else {
            const boneData = sceneManagerRef.current?.boneMap.get(boneName)?.userData;
            initialPoseFromImport[boneName] = {
              position: boneData?.initialLocalPosition ? {...boneData.initialLocalPosition} : {x:0,y:0,z:0},
              quaternion: boneData?.initialLocalQuaternion ? {...boneData.initialLocalQuaternion} : {x:0,y:0,z:0,w:1}
            };
          }
        }
      });
      setLivePose(initialPoseFromImport);

      alert("JSON imported successfully!"); 
      onClose();
      setJsonToImport('');
    } catch (e) { 
      console.error("Import JSON error:", e); 
      alert(`Import failed: ${e.message}`); 
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h4>Import Animation JSON</h4>
        <p>Paste animation JSON data below.</p>
        <textarea
          ref={importJsonTextAreaRef}
          value={jsonToImport}
          onChange={(e) => setJsonToImport(e.target.value)}
          rows={15}
          placeholder='Paste JSON here...'
        />
        <div className="modal-actions">
          <button className="button" onClick={() => processImportedJson(jsonToImport)}>Import</button>
          <button className="button secondary" onClick={() => { onClose(); setJsonToImport(''); }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;