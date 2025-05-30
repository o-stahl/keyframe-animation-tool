import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';

const AnimationContext = createContext();

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within AnimationProvider');
  }
  return context;
};

export const AnimationProvider = ({ children }) => {
  // Model & Scene state
  const [selectedModelFile, setSelectedModelFile] = useState(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [bones, setBones] = useState([]);
  const [selectedBoneName, setSelectedBoneName] = useState(null);
  
  // Transform state
  const [boneRotationUI, setBoneRotationUI] = useState({ x: 0, y: 0, z: 0 });
  const [bonePositionUI, setBonePositionUI] = useState({ x: 0, y: 0, z: 0 });
  const [livePose, setLivePose] = useState({});
  
  // Animation state
  const [animationName, setAnimationName] = useState('MyAnimation');
  const [animationDuration, setAnimationDuration] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [keyFrames, setKeyFrames] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs
  const isGizmoDraggingRef = useRef(false);
  const sceneManagerRef = useRef(null);

  // Reset function for new model
  const resetAllStateForNewModel = useCallback(() => {
    setBones([]);
    setSelectedBoneName(null);
    setBoneRotationUI({ x: 0, y: 0, z: 0 });
    setBonePositionUI({ x: 0, y: 0, z: 0 });
    setLivePose({});
    setKeyFrames({});
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);


  const value = {
    // Model & Scene
    selectedModelFile,
    setSelectedModelFile,
    isLoadingModel,
    setIsLoadingModel,
    isSceneReady,
    setIsSceneReady,
    bones,
    setBones,
    selectedBoneName,
    setSelectedBoneName,
    
    // Transform
    boneRotationUI,
    setBoneRotationUI,
    bonePositionUI,
    setBonePositionUI,
    livePose,
    setLivePose,
    
    // Animation
    animationName,
    setAnimationName,
    animationDuration,
    setAnimationDuration,
    currentTime,
    setCurrentTime,
    keyFrames,
    setKeyFrames,
    isPlaying,
    setIsPlaying,
    
    // Refs
    isGizmoDraggingRef,
    sceneManagerRef,
    
    // Functions
    resetAllStateForNewModel,
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};