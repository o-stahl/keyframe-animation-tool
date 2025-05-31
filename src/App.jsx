import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimationProvider, useAnimation } from './contexts/AnimationContext';
import { useSceneManager } from './hooks/useSceneManager';
import { useKeyframes } from './hooks/useKeyframes';
import Timeline from './components/Timeline';
import BoneList from './components/BoneList';
import TransformPanel from './components/TransformPanel';
import ExportImportPanel from './components/ExportImportPanel';
import JsonModal from './components/modals/JsonModal';
import ImportModal from './components/modals/ImportModal';
import InfoModal from './components/modals/InfoModal';
import './index.css';

function AppContent() {
  const viewportRef = useRef(null);
  const [activeTab, setActiveTab] = useState('scene');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(true);
  const [isDraggingOverModelArea, setIsDraggingOverModelArea] = useState(false);

  const {
    selectedModelFile,
    setSelectedModelFile,
    isLoadingModel,
    isSceneReady,
    isPlaying,
    setIsPlaying,
    animationName,
    setAnimationName,
    animationDuration,
    setAnimationDuration,
    currentTime,
    setCurrentTime,
    bones,
    keyFrames,
    livePose,
    sceneManagerRef,
    setLivePose,
    isGizmoDraggingRef
  } = useAnimation();

  const { handleLoadModel } = useSceneManager(viewportRef);

  const { setKeyframeFromUI, deleteKeyframeAtCurrentTime: deleteKfShortcut } = useKeyframes();

  const processModelFile = useCallback((file) => {
    if (file && file.name.toLowerCase().endsWith('.fbx')) {
      setSelectedModelFile(file);
      handleLoadModel(file);
    } else if (file) {
      alert('Please select an FBX file');
    }
  }, [setSelectedModelFile, handleLoadModel]);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    processModelFile(file);
    if (event.target) {
      event.target.value = null;
    }
  }, [processModelFile]);

  const isModelInputDisabled = isLoadingModel || isPlaying;

  const handleModelDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isModelInputDisabled) {
      setIsDraggingOverModelArea(true);
    }
  }, [isModelInputDisabled]);

  const handleModelDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverModelArea(false);
  }, []);

  const handleModelDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isModelInputDisabled && !isDraggingOverModelArea) {
      setIsDraggingOverModelArea(true);
    }
    if (!isModelInputDisabled) {
      event.dataTransfer.dropEffect = 'copy';
    } else {
      event.dataTransfer.dropEffect = 'none';
    }
  }, [isModelInputDisabled, isDraggingOverModelArea]);

  const handleModelDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverModelArea(false);
    if (isModelInputDisabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processModelFile(files[0]);
      event.dataTransfer.clearData();
    }
  }, [isModelInputDisabled, processModelFile]);


  useEffect(() => {
    const preventGlobalDefaults = (event) => {
        event.preventDefault();
    };
    const preventGlobalDropOpen = (event) => {
        event.preventDefault();
        // For general drops on the window, we set dropEffect to none unless a specific zone handles it.
        // However, our specific drop zones will set it to 'copy'.
        // This ensures files aren't opened by the browser if dropped outside a target.
        // The `dragover` on specific drop zones will override this for those areas.
        if (event.target.id !== "model-file-input" && event.target.id !== "animation-file-input" && !event.target.closest('.file-input-label')) {
             event.dataTransfer.dropEffect = "none";
        }
    };

    window.addEventListener('dragover', preventGlobalDefaults);
    window.addEventListener('drop', preventGlobalDropOpen);

    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        if (activeElement.classList.contains('toolbar-input') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
             // Allow default behavior for time input
        } else {
            return;
        }
      }
      if (showImportModal || showJsonModal || showInfoModal || isGizmoDraggingRef.current) {
        return;
      }

      let handled = false;
      const frameDuration = 1 / 30; // Assuming 30fps for frame steps

      switch (event.key) {
        case ' ': // Spacebar
          if (isSceneReady) {
            if (isPlaying) {
              if (sceneManagerRef.current) sceneManagerRef.current.pauseAnimation();
              setIsPlaying(false);
            } else {
              if (!Object.values(keyFrames).some(t => t && t.length > 0)) {
                console.warn("No keyframes to play.");
                return;
              }
              if (sceneManagerRef.current) {
                if (Object.keys(livePose).length > 0) {
                  sceneManagerRef.current.applyPoseFromData(livePose);
                }
                sceneManagerRef.current.resumeAnimation();
                sceneManagerRef.current.playAnimationFromData(keyFrames, animationDuration);
              }
              setIsPlaying(true);
            }
            handled = true;
          }
          break;
        case 's':
        case 'S':
        case 'k':
        case 'K':
          if (isSceneReady && !isPlaying) {
            setKeyframeFromUI();
            handled = true;
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (isSceneReady && !isPlaying) {
            deleteKfShortcut();
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (isSceneReady && !isPlaying) {
            const newTime = event.shiftKey
              ? Math.max(0, currentTime - 0.1)
              : Math.max(0, currentTime - frameDuration);
            setCurrentTime(parseFloat(newTime.toFixed(4)));
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (isSceneReady && !isPlaying) {
            const newTime = event.shiftKey
              ? Math.min(animationDuration, currentTime + 0.1)
              : Math.min(animationDuration, currentTime + frameDuration);
            setCurrentTime(parseFloat(newTime.toFixed(4)));
            handled = true;
          }
          break;
        case 'Home':
          if (isSceneReady && !isPlaying) {
            setCurrentTime(0);
            handled = true;
          }
          break;
        case 'End':
          if (isSceneReady && !isPlaying) {
            setCurrentTime(animationDuration);
            handled = true;
          }
          break;
        default:
          break;
      }

      if (handled) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragover', preventGlobalDefaults);
      window.removeEventListener('drop', preventGlobalDropOpen);
    };
  }, [
    isSceneReady, isPlaying, setIsPlaying, keyFrames, animationDuration, currentTime, setCurrentTime,
    livePose, sceneManagerRef, setKeyframeFromUI, deleteKfShortcut,
    showImportModal, showJsonModal, showInfoModal, isGizmoDraggingRef
  ]);


  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="panel-tabs">
          <button
            className={`tab-button ${activeTab === 'scene' ? 'active' : ''}`}
            onClick={() => setActiveTab('scene')}
          >
            Scene
          </button>
          <button
            className={`tab-button ${activeTab === 'animate' ? 'active' : ''}`}
            onClick={() => setActiveTab('animate')}
            disabled={!isSceneReady || bones.length === 0}
          >
            Animate
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'scene' ? 'active' : ''}`}>
          <div className="section">
            <h4>Animation Setup</h4>
            <div className="form-row">
              <label>Name</label>
              <input
                type="text"
                value={animationName}
                onChange={(e) => setAnimationName(e.target.value)}
                disabled={isPlaying || !isSceneReady}
              />
            </div>
            <div className="form-row">
              <label>Duration (s)</label>
              <input
                type="number"
                value={animationDuration}
                min="0.1"
                step="0.1"
                onChange={(e) => {
                  const d = parseFloat(e.target.value);
                  if (d > 0) {
                    setAnimationDuration(d);
                    if (currentTime > d) setCurrentTime(d);
                  }
                }}
                disabled={isPlaying || !isSceneReady}
              />
            </div>
          </div>

          <div className="section">
            <h4>Model</h4>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="model-file-input"
                accept=".fbx"
                onChange={handleFileSelect}
                disabled={isModelInputDisabled}
                style={{display: 'none'}}
              />
              <label
                htmlFor="model-file-input"
                className={`file-input-label ${isModelInputDisabled ? 'disabled' : ''} ${isDraggingOverModelArea ? 'drag-over' : ''}`}
                onDragEnter={handleModelDragEnter}
                onDragLeave={handleModelDragLeave}
                onDragOver={handleModelDragOver}
                onDrop={handleModelDrop}
                onClick={(e) => { if (isModelInputDisabled) e.preventDefault();}}
              >
                {selectedModelFile ? selectedModelFile.name : 'Choose FBX Model... (or drop here)'}
              </label>
            </div>
            {isLoadingModel && <div className="loading-text">Loading model...</div>}
          </div>

          <ExportImportPanel setShowImportModal={setShowImportModal} />
        </div>

        <div className={`tab-content ${activeTab === 'animate' ? 'active' : ''}`}>
          <BoneList />
          <TransformPanel />
        </div>
      </div>

      <div className="main-area">
        <div className="top-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Time:</span>
            <input
              type="number"
              className="toolbar-input"
              min="0"
              max={animationDuration}
              step="0.01"
              value={currentTime.toFixed(2)}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              disabled={!isSceneReady || isPlaying}
            />
            <span className="toolbar-label-secondary">/ {animationDuration.toFixed(2)}s</span>
          </div>

          <div className="toolbar-separator"></div>

          <div className="toolbar-group" style={{marginLeft: 'auto'}}>
            <button
              className="button secondary"
              onClick={() => setShowInfoModal(true)}
              title="About this application (Info & Shortcuts)"
            >
              Info
            </button>
            <button
              className="button secondary"
              onClick={() => setShowJsonModal(true)}
              disabled={!isSceneReady}
            >
              View JSON
            </button>
          </div>
        </div>

        <div ref={viewportRef} className="viewport-container">
          {(isLoadingModel || (!isSceneReady && !selectedModelFile)) &&
            <div className="loading-overlay">
              {isLoadingModel ? 'Loading Model...' : 'Please select an FBX model file to begin.'}
            </div>
          }

          {isSceneReady && (
            <div className="viewport-controls">
            </div>
          )}
        </div>

        <Timeline />
      </div>

      <JsonModal show={showJsonModal} onClose={() => setShowJsonModal(false)} />
      <ImportModal show={showImportModal} onClose={() => setShowImportModal(false)} />
      <InfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  );
}

function App() {
  return (
    <AnimationProvider>
      <AppContent />
    </AnimationProvider>
  );
}

export default App;