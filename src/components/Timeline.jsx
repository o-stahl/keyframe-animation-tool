import { useCallback, useMemo, useState } from 'react';
import { useAnimation } from '../contexts/AnimationContext';

const MULTI_TRACK_HEIGHT = 22; // Height of each bone track in multi-track view
const MULTI_TRACK_LABEL_WIDTH = 120; // Width of the bone name label in multi-track view
const MULTI_TRACK_RULER_PADDING = 0; // Padding related to ruler positioning (currently results in top: index * trackHeight)

const Timeline = () => {
  const {
    animationDuration,
    currentTime,
    setCurrentTime,
    keyFrames,
    selectedBoneName,
    setSelectedBoneName,
    isSceneReady,
    isPlaying,
    setIsPlaying,
    isGizmoDraggingRef,
    sceneManagerRef,
    setLivePose,
    bones,
    livePose
  } = useAnimation();

  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false); 

  const handleCurrentTimeChange = useCallback((newTimeInput) => {
    setCurrentTime(parseFloat(parseFloat(newTimeInput).toFixed(4)));
  }, [setCurrentTime]);

  const syncLivePoseFromScene = useCallback(() => {
    if (!sceneManagerRef.current || !isSceneReady || bones.length === 0) return;
    const currentScenePose = {};
    bones.forEach(bInfo => {
      const bone = sceneManagerRef.current.getBoneByName(bInfo.name);
      if (bone) {
        currentScenePose[bInfo.name] = {
          position: { x: bone.position.x, y: bone.position.y, z: bone.position.z },
          quaternion: { x: bone.quaternion.x, y: bone.quaternion.y, z: bone.quaternion.z, w: bone.quaternion.w }
        };
      } else {
        currentScenePose[bInfo.name] = livePose[bInfo.name] || {position: {x:0,y:0,z:0}, quaternion: {x:0,y:0,z:0,w:1}};
      }
    });
    setLivePose(currentScenePose);
  }, [isSceneReady, bones, setLivePose, livePose, sceneManagerRef]);

  const handlePlayPause = useCallback(() => {
    if (!sceneManagerRef.current || !isSceneReady) return;
    if (isPlaying) {
      sceneManagerRef.current.pauseAnimation();
      setIsPlaying(false);
      syncLivePoseFromScene();
    } else {
      if (!Object.values(keyFrames).some(t => t && t.length > 0)) { 
        alert("No keyframes."); 
        return; 
      }
      if (Object.keys(livePose).length > 0) {
        sceneManagerRef.current.applyPoseFromData(livePose);
      }
      sceneManagerRef.current.resumeAnimation();
      sceneManagerRef.current.playAnimationFromData(keyFrames, animationDuration);
      setIsPlaying(true);
    }
  }, [isPlaying, isSceneReady, keyFrames, animationDuration, livePose, setIsPlaying, syncLivePoseFromScene, sceneManagerRef]);

  const handleStop = useCallback(() => {
    if (sceneManagerRef.current && isSceneReady) {
      sceneManagerRef.current.stopAnimation();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isSceneReady, setIsPlaying, setCurrentTime, sceneManagerRef]);

  const animatedBoneNames = useMemo(() => {
    return Object.keys(keyFrames).filter(boneName => keyFrames[boneName] && keyFrames[boneName].length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [keyFrames]);

  const handleBoneTrackClick = (boneName) => {
    if (!isPlaying && !isGizmoDraggingRef.current) {
      setSelectedBoneName(boneName);
    }
  };

  const renderMultiTrackView = () => {
    if (!isSceneReady || animationDuration <= 0 || animatedBoneNames.length === 0) return null;

    const trackHeight = MULTI_TRACK_HEIGHT;
    const labelWidth = MULTI_TRACK_LABEL_WIDTH;
    const rulerPadding = MULTI_TRACK_RULER_PADDING;

    return (
      <div className="multi-track-container" style={{ position: 'relative', width: '100%', height: `${animatedBoneNames.length * trackHeight}px` }}>
        {animatedBoneNames.map((boneName, index) => {
          const boneTrackData = keyFrames[boneName];
          if (!boneTrackData || boneTrackData.length === 0) return null; 

          return (
            <div 
              key={boneName} 
              className={`timeline-bone-track ${selectedBoneName === boneName ? 'selected' : ''}`}
              style={{ 
                top: `${index * trackHeight + rulerPadding}px`, 
                height: `${trackHeight}px`,
                position: 'absolute', 
                left: '0',
                width: '100%',
              }}
              onClick={() => handleBoneTrackClick(boneName)}
            >
              <div 
                className="timeline-bone-label"
                style={{ 
                  width: `${labelWidth}px`, 
                }}
              >
                {boneName}
              </div>
              <div 
                className="timeline-markers-area-for-bone"
                style={{ 
                  width: `calc(100% - ${labelWidth}px)`, 
                }}
              >
                {boneTrackData.map(kf => {
                  const percent = (kf.time / animationDuration) * 100;
                  if (percent < 0 || percent > 100) return null;
                  return (
                    <div 
                      key={`${boneName}-${kf.time.toString().replace('.','_')}`}
                      className="timeline-marker"
                      style={{ 
                        left: `${percent}%`, 
                      }}
                      title={`Keyframe for ${boneName} at ${kf.time.toFixed(2)}s`}
                      onClick={(e) => {
                        e.stopPropagation(); 
                        if (!isPlaying && !isGizmoDraggingRef.current) {
                          setCurrentTime(kf.time);
                          setSelectedBoneName(boneName); 
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderSingleTrackView = () => {
    const labelWidth = MULTI_TRACK_LABEL_WIDTH; // Consistent label width
    const hasValidSelectedBoneTrack = selectedBoneName && keyFrames[selectedBoneName] && keyFrames[selectedBoneName].length > 0 && animationDuration > 0 && isSceneReady;

    return (
        <div 
            className={`timeline-bone-track single-selected ${!hasValidSelectedBoneTrack ? 'placeholder' : ''}`}
        >
             <div className="timeline-bone-label" style={{ width: `${labelWidth}px`}}>
                {selectedBoneName || "No Bone"}
              </div>
            <div className="timeline-markers-area-for-bone" style={{width: `calc(100% - ${labelWidth}px)`}}>
              {hasValidSelectedBoneTrack ? (
                keyFrames[selectedBoneName].map(kf => {
                    const percent = (kf.time / animationDuration) * 100;
                    if (percent < 0 || percent > 100) return null;
                    return (
                    <div 
                        key={`${selectedBoneName}-${kf.time.toString().replace('.','_')}`}
                        className="timeline-marker"
                        style={{ left: `${percent}%`}}
                        title={`Keyframe for ${selectedBoneName} at ${kf.time.toFixed(2)}s`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isPlaying && !isGizmoDraggingRef.current) setCurrentTime(kf.time);
                        }}
                    />
                    );
                })
              ) : (
                <span className="timeline-placeholder-text">
                  {!isSceneReady ? "Scene not ready" : !selectedBoneName ? "Select bone" : "No keyframes"}
                </span>
              )}
            </div>
        </div>
    );
  };

  return (
    <div className={`timeline-container ${isTimelineExpanded && animatedBoneNames.length > 0 ? 'expanded' : 'collapsed'}`}>
      <div className="timeline-header">
        <button 
            onClick={() => setIsTimelineExpanded(!isTimelineExpanded)} 
            className="timeline-button"
            title={isTimelineExpanded ? "Collapse Tracks" : "Expand Tracks"}
            disabled={!isSceneReady || animatedBoneNames.length === 0}
        >
          {isTimelineExpanded ? 
            <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.00002 6.5L8.00002 10.5L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : 
            <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.00002 9.5L8.00002 5.5L12 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
        <div className="timeline-header-info">
          <span className="timeline-title">Timeline</span>
          <span className="timeline-info">Frame {Math.round(currentTime * 30)} / {Math.round(animationDuration * 30)}</span>
        </div>
        
        <div className="timeline-controls">
          <button 
            className={`timeline-button ${isPlaying ? 'pause' : 'play'}`} 
            onClick={handlePlayPause}
            disabled={!isSceneReady || (Object.values(keyFrames).every(track => track && track.length === 0) && bones.length === 0)}
          >
            {isPlaying ? (
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 3h2v10H5zM9 3h2v10H9z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 3l9 5-9 5z"/>
              </svg>
            )}
          </button>
          <button 
            className="timeline-button stop" 
            onClick={handleStop}
            disabled={!isSceneReady || !isPlaying}
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="10" height="10"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="timeline-content"> 
        <div className="timeline-ruler"> 
          <div 
            className="timeline-playhead" 
            style={{
              left: `${animationDuration > 0 ? (currentTime / animationDuration) * 100 : 0}%`,
              zIndex: 10 
            }}
          ></div>
          {isSceneReady && (isTimelineExpanded && animatedBoneNames.length > 0 ? renderMultiTrackView() : renderSingleTrackView())}
        </div>
        
        <div className="timeline-slider-container">
          <input 
            type="range" 
            className="timeline-slider" 
            min="0" 
            max={animationDuration} 
            step="0.01" 
            value={currentTime}
            onChange={(e) => handleCurrentTimeChange(e.target.value)}
            disabled={!isSceneReady || isPlaying || animationDuration <= 0}
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;