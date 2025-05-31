import { useCallback, useState } from 'react';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { useAnimation } from '../contexts/AnimationContext';
import { generateAnimationJson, createThreeAnimationTracks, parseAnimationClipToKATKeyframes } from '../utils/animationHelpers';
import { useKeyframes } from '../hooks/useKeyframes';

const ExportImportPanel = ({ setShowImportModal }) => {
  const {
    animationName,
    animationDuration,
    keyFrames,
    isSceneReady,
    sceneManagerRef,
    isPlaying,
    bones,
    setAnimationName,
    setAnimationDuration,
    setKeyFrames,
    setCurrentTime,
    setLivePose,
    setIsLoadingModel,
    isLoadingModel
  } = useAnimation();

  const { totalKeyframeCount } = useKeyframes();
  const [isDraggingOverAnimationArea, setIsDraggingOverAnimationArea] = useState(false);

  const handleExportJson = useCallback(() => {
    if (!isSceneReady) {
      alert("Load a model first.");
      return;
    }
    let hasAnyKF = Object.values(keyFrames).some(track => track && track.length > 0);
    if (!hasAnyKF) {
      alert("No keyframes to export.");
      return;
    }
    const jsonString = generateAnimationJson(animationName, animationDuration, keyFrames);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${animationName.replace(/\s+/g, '_') || 'animation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }, [isSceneReady, keyFrames, animationName, animationDuration]);

  const handleExportGLTF = useCallback(() => {
    if (!isSceneReady || !sceneManagerRef.current) {
      alert("Load a model first.");
      return;
    }
    if (totalKeyframeCount === 0) {
      alert("No keyframes to export.");
      return;
    }

    const exporter = new GLTFExporter();
    const model = sceneManagerRef.current.model;
    if (!model) {
      alert("No model to export.");
      return;
    }

    const tracks = createThreeAnimationTracks(keyFrames, sceneManagerRef.current);

    if (tracks.length === 0) {
      alert("No valid animation tracks to export.");
      return;
    }

    const clip = new THREE.AnimationClip(animationName, animationDuration, tracks);
    const animations = [clip];

    const options = {
      binary: true,
      animations: animations,
      includeCustomExtensions: true
    };

    exporter.parse(
      model,
      function (result) {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${animationName.replace(/\s+/g, '_') || 'animated_model'}.glb`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      },
      function (error) {
        console.error('GLTFExporter error:', error);
        alert('Export failed: ' + error.message);
      },
      options
    );
  }, [isSceneReady, keyFrames, animationName, animationDuration, sceneManagerRef, totalKeyframeCount]);

  const processAnimationFile = useCallback(async (file) => {
    if (!file) return;
    if (!sceneManagerRef.current || bones.length === 0) {
      alert("Please load a base model first before importing an animation.");
      return;
    }

    setIsLoadingModel(true);
    const objectURL = URL.createObjectURL(file);
    let loader;
    const fileNameLower = file.name.toLowerCase();

    if (fileNameLower.endsWith('.fbx')) {
      loader = new FBXLoader();
    } else if (fileNameLower.endsWith('.glb') || fileNameLower.endsWith('.gltf')) {
      loader = new GLTFLoader();
    } else {
      alert("Unsupported animation file type. Please use .fbx, .glb, or .gltf.");
      setIsLoadingModel(false);
      URL.revokeObjectURL(objectURL);
      return;
    }

    try {
      const loadedAsset = await loader.loadAsync(objectURL);
      if (!loadedAsset.animations || loadedAsset.animations.length === 0) {
        throw new Error("No animations found in the imported file.");
      }

      const clip = loadedAsset.animations[0];
      const {
        animationName: importedName,
        animationDuration: importedDuration,
        keyFrames: importedKeyframes,
        skippedBones
      } = parseAnimationClipToKATKeyframes(clip, bones, sceneManagerRef.current);

      const importedBoneNames = Object.keys(importedKeyframes);
      const totalTracksInClip = new Set(clip.tracks.map(t => t.name.split('.')[0])).size;


      if (skippedBones.length > 0) {
        console.warn(`Warning: Some animation tracks were skipped because the following bones were not found in the current model: ${skippedBones.join(', ')}`);
        if (importedBoneNames.length === 0) { // All imported tracks were for skipped bones, or valid tracks had no data
             alert(`Animation import failed: No tracks matched bones in the current model. Skipped bones include: ${skippedBones.slice(0,5).join(', ')}${skippedBones.length > 5 ? '...' : ''}`);
        } else { // Some tracks imported, some skipped
            alert(`Animation imported with warnings. Some tracks were skipped for bones not found: ${skippedBones.slice(0,3).join(', ')}${skippedBones.length > 3 ? '...' : ''}`);
        }
      }

      if (importedBoneNames.length === 0 && skippedBones.length >= totalTracksInClip) {
         throw new Error("No compatible animation tracks found for the current model's skeleton.");
      }
      
      if (importedBoneNames.length === 0 && skippedBones.length === 0 && totalTracksInClip > 0) {
        throw new Error("Animation file contains tracks, but none could be processed or matched to the current model's structure.");
      }


      if (importedBoneNames.length > 0) {
        setAnimationName(importedName || file.name.replace(/\.[^/.]+$/, ""));
        setAnimationDuration(importedDuration > 0 ? importedDuration : 5);
        setKeyFrames(importedKeyframes);
        setCurrentTime(0);

        const initialPoseFromImport = {};
        bones.forEach(bInfo => {
          const boneName = bInfo.name;
          if (sceneManagerRef.current) {
            const interpolated = sceneManagerRef.current.interpolatePoseAtTimeForBone(
              boneName,
              importedKeyframes,
              0
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

        if (skippedBones.length === 0) {
          alert("Animation imported successfully.");
        }
      } else if (skippedBones.length === 0 && totalTracksInClip === 0 && (!loadedAsset.animations || loadedAsset.animations.length === 0)) {
        // This case is already handled by "No animations found in the imported file."
      }


    } catch (error) {
      console.error("Error importing animation:", error);
      alert(`Failed to import animation: ${error.message}`);
    } finally {
      setIsLoadingModel(false);
      URL.revokeObjectURL(objectURL);
    }
  }, [
    sceneManagerRef, bones, setIsLoadingModel, setAnimationName,
    setAnimationDuration, setKeyFrames, setCurrentTime, setLivePose
  ]);

  const handleAnimationFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (file) {
      await processAnimationFile(file);
    }
    if (event.target) {
      event.target.value = null;
    }
  }, [processAnimationFile]);

  const isAnimationInputDisabled = isPlaying || !isSceneReady || bones.length === 0 || isLoadingModel;

  const handleAnimationDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAnimationInputDisabled) {
      setIsDraggingOverAnimationArea(true);
    }
  }, [isAnimationInputDisabled]);

  const handleAnimationDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverAnimationArea(false);
  }, []);

  const handleAnimationDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAnimationInputDisabled && !isDraggingOverAnimationArea) {
      setIsDraggingOverAnimationArea(true);
    }
    if (!isAnimationInputDisabled) {
      event.dataTransfer.dropEffect = 'copy';
    } else {
      event.dataTransfer.dropEffect = 'none';
    }
  }, [isAnimationInputDisabled, isDraggingOverAnimationArea]);

  const handleAnimationDrop = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverAnimationArea(false);
    if (isAnimationInputDisabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      await processAnimationFile(files[0]);
      event.dataTransfer.clearData();
    }
  }, [isAnimationInputDisabled, processAnimationFile]);


  return (
    <>
      <div className="section">
        <h4>Import Animation</h4>
        <div className="file-input-wrapper">
          <input
            type="file"
            id="animation-file-input"
            accept=".fbx,.glb,.gltf"
            onChange={handleAnimationFileSelect}
            disabled={isAnimationInputDisabled}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="animation-file-input"
            className={`file-input-label ${isAnimationInputDisabled ? 'disabled' : ''} ${isDraggingOverAnimationArea ? 'drag-over' : ''}`}
            style={{
              opacity: isAnimationInputDisabled ? 0.5 : 1,
              cursor: isAnimationInputDisabled ? 'not-allowed' : 'pointer'
            }}
            onClick={(e) => { if (isAnimationInputDisabled) e.preventDefault(); }}
            onDragEnter={handleAnimationDragEnter}
            onDragLeave={handleAnimationDragLeave}
            onDragOver={handleAnimationDragOver}
            onDrop={handleAnimationDrop}
          >
            {isLoadingModel && bones.length > 0 ? 'Loading Animation...' : 'Import Animation (FBX/GLB/GLTF or drop)'}
          </label>
        </div>
        <div style={{marginTop: '8px'}}>
          <button
            className="button secondary"
            style={{width: '100%'}}
            onClick={() => { setShowImportModal(true); }}
            disabled={isPlaying || !isSceneReady}
          >
            Import Keyframe JSON
          </button>
        </div>
      </div>

      <div className="section">
        <h4>Export Animation</h4>
        <div className="button-group">
          <button className="button secondary" onClick={handleExportJson} disabled={isPlaying || !isSceneReady || totalKeyframeCount === 0}>
            Export JSON
          </button>
          <button className="button secondary" onClick={handleExportGLTF} disabled={isPlaying || !isSceneReady || totalKeyframeCount === 0}>
            Export GLB
          </button>
        </div>
      </div>
    </>
  );
};

export default ExportImportPanel;