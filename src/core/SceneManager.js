import * as GlobalTHREE from 'three'; 
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

const TARGET_MODEL_MAX_DIMENSION = 150; // Used to normalize model size on import

class SceneManager {
    constructor(containerElement) {
        this.containerElement = containerElement; 

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null; 
        this.transformControls = null; 
        
        this.model = null;
        this.skeletonHelper = null;
        this.bones = [];
        this.boneMap = new Map(); 

        this.mixer = null;
        this.clock = new GlobalTHREE.Clock(); 
        this.activeAction = null;

        this.raycaster = new GlobalTHREE.Raycaster();
        this.mouse = new GlobalTHREE.Vector2();

        this.onBoneTransformChangeByGizmoCallback = null; 
        this.onTimeUpdateCallback = null;
        this.onGizmoDraggingChangedCallback = null;
        this.onBoneClickCallback = null;
        this.animationFrameId = null;
        this.onWindowResizeBound = null;
        this.onMouseClickBound = null;

        this.boneMarkersGroup = new GlobalTHREE.Group();
        this.markerGeometry = new GlobalTHREE.SphereGeometry(2.5, 8, 8); // Small marker size
        this.defaultMarkerMaterial = new GlobalTHREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false });
        this.selectedMarkerMaterial = new GlobalTHREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
        this.boneMarkersGroup.renderOrder = 1; // Render markers on top

        this.init(); 
        this.animate(); 
    }

    init() {
        const THREE = GlobalTHREE; 
        if (!this.scene) {
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xcccccc);
            this.scene.fog = new THREE.FogExp2(0xcccccc, 0.002);
        }

        this.scene.add(this.boneMarkersGroup);

        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            if(this.containerElement && this.renderer.domElement && !this.containerElement.contains(this.renderer.domElement)) {
                this.containerElement.appendChild(this.renderer.domElement);
            }
        }
        if (this.containerElement && this.renderer) { 
             this.renderer.setSize(this.containerElement.clientWidth, this.containerElement.clientHeight);
        }


        if (!this.camera) {
            this.camera = new THREE.PerspectiveCamera(60, this.containerElement ? this.containerElement.clientWidth / this.containerElement.clientHeight : 1, 0.1, 2000);
            this.camera.position.set(100, 200, 300);
        } else {
            if (this.containerElement) {
                this.camera.aspect = this.containerElement.clientWidth / this.containerElement.clientHeight;
                this.camera.updateProjectionMatrix();
            }
        }


        if (!this.controls && this.camera && this.renderer) { 
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.set(0, 100, 0); 
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 10;
            this.controls.maxDistance = 1000;
        }
        if (this.controls) this.controls.update();


        if (!this.scene.getObjectByName("hemiLight")) {
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
            hemiLight.name = "hemiLight";
            hemiLight.position.set(0, 200, 0);
            this.scene.add(hemiLight);
        }
        if (!this.scene.getObjectByName("dirLight")) {
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.name = "dirLight";
            dirLight.position.set(50, 200, 100);
            dirLight.castShadow = true;
            dirLight.shadow.camera.top = 180;
            dirLight.shadow.camera.bottom = -100;
            dirLight.shadow.camera.left = -120;
            dirLight.shadow.camera.right = 120;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            this.scene.add(dirLight);
        }
        if (!this.scene.getObjectByName("gridHelper")) {
            const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
            grid.name = "gridHelper";
            grid.material.opacity = 0.2;
            grid.material.transparent = true;
            this.scene.add(grid);
        }

        if (!this.transformControls && this.camera && this.renderer) { 
            this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
            this.transformControls.addEventListener('dragging-changed', (event) => {
                if (this.controls) {
                    this.controls.enabled = !event.value;
                }
                if (this.onGizmoDraggingChangedCallback) { 
                    this.onGizmoDraggingChangedCallback(event.value);
                }
            });
            this.transformControls.addEventListener('objectChange', () => {
                if (this.transformControls.object) { 
                    const bone = this.transformControls.object;
                    if (this.model) {
                        this.model.updateMatrixWorld(true); 
                    }
                    if (this.onBoneTransformChangeByGizmoCallback) {
                        this.onBoneTransformChangeByGizmoCallback(
                            bone.name,
                            bone.position,   
                            bone.quaternion  
                        );
                    }
                }
            });
            this.transformControls.setSize(1.0); 
            this.scene.add(this.transformControls);
        }
        
        if (this.onWindowResizeBound) { 
            window.removeEventListener('resize', this.onWindowResizeBound);
        }
        if (this.onMouseClickBound) {
            this.renderer.domElement.removeEventListener('click', this.onMouseClickBound);
        }
        this.onWindowResizeBound = this.onWindowResize.bind(this); 
        this.onMouseClickBound = this.onMouseClick.bind(this);
        window.addEventListener('resize', this.onWindowResizeBound);
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.addEventListener('click', this.onMouseClickBound);
        }
    }

    onWindowResize() {
        if (!this.containerElement || !this.renderer || !this.camera) return;
        this.camera.aspect = this.containerElement.clientWidth / this.containerElement.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.containerElement.clientWidth, this.containerElement.clientHeight);
    }

    onMouseClick(event) {
        if (!this.model || !this.camera || !this.renderer || !this.onBoneClickCallback) return;
        if (this.transformControls && this.transformControls.dragging) return;
        if (!this.boneMarkersGroup.visible) return; 
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.boneMarkersGroup.children, false); 

        if (intersects.length > 0) {
            const closestMarker = intersects[0].object;
            if (closestMarker && closestMarker.userData.boneName) {
                this.onBoneClickCallback(closestMarker.userData.boneName);
            }
        }
    }

    createOrUpdateBoneMarkers() {
        while(this.boneMarkersGroup.children.length > 0){
            const marker = this.boneMarkersGroup.children[0];
            this.boneMarkersGroup.remove(marker);
        }

        this.bones.forEach(boneInfo => {
            const bone = this.getBoneByName(boneInfo.name);
            if (!bone) return;

            const marker = new GlobalTHREE.Mesh(this.markerGeometry, this.defaultMarkerMaterial);
            marker.userData.boneName = boneInfo.name;
            this.boneMarkersGroup.add(marker);
        });
        this.updateBoneMarkerPositions();
        this.highlightSelectedBoneMarker(null); 
    }

    updateBoneMarkerPositions() {
        if (!this.model) return;
        this.model.updateMatrixWorld(true); 

        this.boneMarkersGroup.children.forEach(marker => {
            const bone = this.getBoneByName(marker.userData.boneName);
            if (bone) {
                marker.position.setFromMatrixPosition(bone.matrixWorld);
            }
        });
    }

    highlightSelectedBoneMarker(selectedBoneName) {
        this.boneMarkersGroup.children.forEach(marker => {
            if (marker.userData.boneName === selectedBoneName) {
                marker.material = this.selectedMarkerMaterial;
            } else {
                marker.material = this.defaultMarkerMaterial;
            }
        });
    }


    setOnGizmoDraggingChangedCallback(callback) { 
        this.onGizmoDraggingChangedCallback = callback;
    }

    setOnBoneClickCallback(callback) {
        this.onBoneClickCallback = callback;
    }

    clearModel() {
        this.detachGizmo(); 
        if (this.model && this.scene) { 
            this.scene.remove(this.model);
            this.model.traverse(child => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m?.dispose());
                    } else {
                        child.material?.dispose();
                    }
                }
            });
            this.model = null;
        }
        if (this.skeletonHelper && this.scene) { 
            this.scene.remove(this.skeletonHelper);
            this.skeletonHelper.dispose();
            this.skeletonHelper = null;
        }
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
        this.bones = [];
        this.boneMap.clear();

        while(this.boneMarkersGroup.children.length > 0){
            this.boneMarkersGroup.remove(this.boneMarkersGroup.children[0]);
        }
    }

    loadModel(url) {
        const THREE = GlobalTHREE;
        return new Promise((resolve, reject) => {
            if (!this.scene) { 
                this.init(); 
                if(!this.scene) {
                    reject(new Error("SceneManager.loadModel: Scene could not be initialized."));
                    return;
                }
            }
            this.clearModel(); 
            const loader = new FBXLoader();
            loader.load(url, (object) => {
                this.model = object;
                const initialBox = new THREE.Box3().setFromObject(this.model);
                const initialSize = initialBox.getSize(new THREE.Vector3());
                const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
                let desiredScale = 1.0;
                if (maxDim > 0 && !isNaN(maxDim) && isFinite(maxDim)) { 
                    desiredScale = TARGET_MODEL_MAX_DIMENSION / maxDim; 
                }
                this.model.scale.setScalar(desiredScale);
                const scaledBox = new THREE.Box3().setFromObject(this.model);
                const scaledBoxCenter = scaledBox.getCenter(new THREE.Vector3());
                this.model.position.set(
                    -scaledBoxCenter.x, -scaledBox.min.y, -scaledBoxCenter.z
                );
                if (this.scene) { this.scene.add(this.model); } 
                else { reject(new Error("Scene is null, cannot add model.")); return; }
                this.model.updateMatrixWorld(true);
                const initialBoneData = {};
                this.model.traverse((child) => {
                    if (child.isBone) {
                        this.bones.push({ name: child.name, bone: child });
                        this.boneMap.set(child.name, child);
                        
                        const pos = child.position.clone(); 
                        const quat = child.quaternion.clone(); 

                        child.userData.initialLocalPosition = { x: pos.x, y: pos.y, z: pos.z };
                        child.userData.initialLocalQuaternion = { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
                        
                        initialBoneData[child.name] = {
                            position: { 
                                x: typeof pos.x === 'number' ? pos.x : 0, 
                                y: typeof pos.y === 'number' ? pos.y : 0, 
                                z: typeof pos.z === 'number' ? pos.z : 0 
                            },
                            quaternion: { 
                                x: typeof quat.x === 'number' ? quat.x : 0, 
                                y: typeof quat.y === 'number' ? quat.y : 0, 
                                z: typeof quat.z === 'number' ? quat.z : 0, 
                                w: typeof quat.w === 'number' ? quat.w : 1 
                            }
                        };
                    }
                    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
                });
                this.bones.sort((a, b) => a.name.localeCompare(b.name));
                this.createOrUpdateBoneMarkers(); 

                this.skeletonHelper = new THREE.SkeletonHelper(this.model);
                this.skeletonHelper.visible = true;
                if (this.scene) { this.scene.add(this.skeletonHelper); }
                this.mixer = new THREE.AnimationMixer(this.model);
                const worldBoundingBox = new THREE.Box3().setFromObject(this.model); 
                const worldCenter = worldBoundingBox.getCenter(new THREE.Vector3());
                if (this.controls) { this.controls.target.copy(worldCenter); this.controls.update(); }
                if(this.camera) this.camera.lookAt(worldCenter); 
                resolve(initialBoneData); 
            }, undefined, (error) => {
                console.error(`SceneManager.loadModel: An error happened during FBX loading (${url}):`, error);
                reject(error);
            });
        });
    }

    getBones() { return this.bones.map(b => ({ name: b.name })); }
    getBoneByName(boneName) { return this.boneMap.get(boneName); }

    setBoneTransform(boneName, position, quaternion) {
        const bone = this.getBoneByName(boneName);
        if (bone) {
            const isGizmoActiveOnThisBone = this.transformControls && 
                                            this.transformControls.object === bone && 
                                            this.transformControls.dragging;
            if (!isGizmoActiveOnThisBone) {
                if (position && typeof position.x === 'number' && typeof position.y === 'number' && typeof position.z === 'number') {
                     bone.position.set(position.x, position.y, position.z);
                }
                if (quaternion && typeof quaternion.x === 'number' && typeof quaternion.y === 'number' && typeof quaternion.z === 'number' && typeof quaternion.w === 'number') {
                     bone.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                }
            }
        }
    }
    
    applyPoseFromData(poseData) {
        if (!this.model || !this.boneMap) return;
        let poseChanged = false;
        for (const boneName in poseData) {
            const bone = this.boneMap.get(boneName);
            const transform = poseData[boneName];
            if (bone && transform) {
                if (transform.position && 
                    typeof transform.position.x === 'number' && 
                    typeof transform.position.y === 'number' && 
                    typeof transform.position.z === 'number' ) {
                    const tempP = new GlobalTHREE.Vector3(transform.position.x, transform.position.y, transform.position.z);
                    if(!bone.position.equals(tempP)) { 
                        bone.position.copy(tempP);
                        poseChanged = true;
                    }
                }
                if (transform.quaternion && 
                    typeof transform.quaternion.x === 'number' &&
                    typeof transform.quaternion.y === 'number' &&
                    typeof transform.quaternion.z === 'number' &&
                    typeof transform.quaternion.w === 'number') {
                    const tempQ = new GlobalTHREE.Quaternion(transform.quaternion.x, transform.quaternion.y, transform.quaternion.z, transform.quaternion.w);
                    if(!bone.quaternion.equals(tempQ)) { 
                        bone.quaternion.copy(tempQ);
                        poseChanged = true;
                    }
                }
            }
        }
        if (poseChanged && this.model) {
            this.model.updateMatrixWorld(true);
        }
    }

    attachGizmo(boneName) {
        const bone = this.getBoneByName(boneName);
        if (bone && this.transformControls) {
            this.transformControls.attach(bone);
            this.transformControls.setMode('rotate'); 
            this.transformControls.setSpace('local');  
            this.transformControls.userData = { ...this.transformControls.userData, selectedBoneName: boneName }; 
            this.highlightSelectedBoneMarker(boneName);
        } else { this.detachGizmo(); }
    }
    detachGizmo() {
        if (this.transformControls) {
            this.transformControls.detach();
             if (this.transformControls.userData) delete this.transformControls.userData.selectedBoneName;
            this.highlightSelectedBoneMarker(null); 
        }
    }

    setOnBoneTransformChangeByGizmo(callback) { this.onBoneTransformChangeByGizmoCallback = callback; }

    playAnimationFromData(keyFramesData, duration) {
        const THREE = GlobalTHREE;
        if (!this.model || !this.mixer) { 
            console.warn("SceneManager: Cannot play animation - model or mixer not ready."); 
            return; 
        }
        this.detachGizmo(); 
        if (this.activeAction) {
            this.activeAction.stop();
            if (this.activeAction.getClip()) this.mixer.uncacheClip(this.activeAction.getClip()); 
            this.activeAction = null; 
        }
        const tracks = [];
        for (const boneName in keyFramesData) {
            const boneTrackData = keyFramesData[boneName];
            const bone = this.getBoneByName(boneName);
            if (bone && boneTrackData && boneTrackData.length > 0) {
                const rotTimes = boneTrackData.filter(kf => kf.rotation).map(kf => kf.time).sort((a,b)=>a-b);
                const rotValues = [];
                if (rotTimes.length > 0) { 
                    rotTimes.forEach(t => {
                        const kf = boneTrackData.find(kf => kf.time === t && kf.rotation);
                        if(kf) rotValues.push(kf.rotation.x, kf.rotation.y, kf.rotation.z, kf.rotation.w);
                    });
                    if (rotValues.length > 0) tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, rotTimes, rotValues));
                }
                const posTimes = boneTrackData.filter(kf => kf.position).map(kf => kf.time).sort((a,b)=>a-b);
                const posValues = [];
                 if (posTimes.length > 0) {
                    posTimes.forEach(t => {
                        const kf = boneTrackData.find(kf => kf.time === t && kf.position);
                        if(kf) posValues.push(kf.position.x, kf.position.y, kf.position.z);
                    });
                    if (posValues.length > 0) tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, posTimes, posValues));
                }
            }
        }
        if (tracks.length === 0) { 
            console.warn("SceneManager: No keyframe tracks to play."); 
            return; 
        } 
        const clip = new THREE.AnimationClip("customAnimation", duration, tracks);
        this.activeAction = this.mixer.clipAction(clip);
        this.activeAction.setLoop(THREE.LoopRepeat); 
        this.activeAction.reset().play();
        this.mixer.setTime(0); 
        this.clock.start(); 
    }
    
    pauseAnimation() { if (this.activeAction && this.mixer) this.mixer.timeScale = 0; }
    resumeAnimation() { if (this.activeAction && this.mixer) { this.mixer.timeScale = 1; this.detachGizmo(); } }
    stopAnimation() {
        if (this.mixer) { this.mixer.stopAllAction(); this.mixer.setTime(0); }
        if (this.activeAction) {
            if(this.activeAction.getClip() && this.mixer) this.mixer.uncacheClip(this.activeAction.getClip());
            this.activeAction = null; 
        }
        if (this.transformControls && this.transformControls.userData?.selectedBoneName) {
            const boneName = this.transformControls.userData.selectedBoneName;
            if(this.getBoneByName(boneName)) this.attachGizmo(boneName);
        }
    }
    setOnTimeUpdate(callback) { this.onTimeUpdateCallback = callback; }

    interpolatePoseAtTimeForBone(boneName, keyFramesData, time) {
        const THREE = GlobalTHREE; 

        const bone = this.boneMap.get(boneName);
        if (!bone || !bone.userData.initialLocalPosition || !bone.userData.initialLocalQuaternion) {
            return { 
                position: { x:0, y:0, z:0 }, 
                quaternion: { x:0, y:0, z:0, w:1 } 
            };
        }

        let finalPosition = { ...bone.userData.initialLocalPosition };
        let finalQuaternion = { ...bone.userData.initialLocalQuaternion };

        const track = keyFramesData[boneName];

        if (track && track.length > 0) {
            let kf1_rot = null, kf2_rot = null;
            const rotKeyframes = track.filter(kf => kf.rotation);
            for (const kf of rotKeyframes) {
                if (kf.time <= time) kf1_rot = kf;
                if (kf.time > time) { kf2_rot = kf; break; }
            }
            
            let kf1_pos = null, kf2_pos = null;
            const posKeyframes = track.filter(kf => kf.position);
            for (const kf of posKeyframes) {
                if (kf.time <= time) kf1_pos = kf;
                if (kf.time > time) { kf2_pos = kf; break; }
            }
            
            if (kf1_rot && kf1_rot.rotation) {
                const q1 = new THREE.Quaternion(kf1_rot.rotation.x, kf1_rot.rotation.y, kf1_rot.rotation.z, kf1_rot.rotation.w);
                if (!kf2_rot || !kf2_rot.rotation || kf1_rot.time >= time ) { 
                    finalQuaternion = { x: q1.x, y: q1.y, z: q1.z, w: q1.w };
                } else {
                    const t = (kf2_rot.time - kf1_rot.time === 0) ? 0 : Math.max(0, Math.min(1, (time - kf1_rot.time) / (kf2_rot.time - kf1_rot.time)));
                    const q2 = new THREE.Quaternion(kf2_rot.rotation.x, kf2_rot.rotation.y, kf2_rot.rotation.z, kf2_rot.rotation.w);
                    
                    const tempSlerpQ = q1.clone(); 
                    tempSlerpQ.slerp(q2, t);    
                    finalQuaternion = { x: tempSlerpQ.x, y: tempSlerpQ.y, z: tempSlerpQ.z, w: tempSlerpQ.w };
                }
            } else {
                 const firstKfWithRot = rotKeyframes.length > 0 ? rotKeyframes[0] : null;
                 if (firstKfWithRot && firstKfWithRot.rotation && time < firstKfWithRot.time) {
                   finalQuaternion = { ...firstKfWithRot.rotation };
                }
            }

            if (kf1_pos && kf1_pos.position) {
                const p1 = new THREE.Vector3(kf1_pos.position.x, kf1_pos.position.y, kf1_pos.position.z);
                if (!kf2_pos || !kf2_pos.position || kf1_pos.time >= time) { 
                    finalPosition = { x: p1.x, y: p1.y, z: p1.z };
                } else {
                    const t = (kf2_pos.time - kf1_pos.time === 0) ? 0 : Math.max(0, Math.min(1, (time - kf1_pos.time) / (kf2_pos.time - kf1_pos.time)));
                    const p2 = new THREE.Vector3(kf2_pos.position.x, kf2_pos.position.y, kf2_pos.position.z);
                    const tempV = new THREE.Vector3().lerpVectors(p1, p2, t); 
                    finalPosition = { x: tempV.x, y: tempV.y, z: tempV.z };
                }
            } else {
                const firstKfWithPos = posKeyframes.length > 0 ? posKeyframes[0] : null;
                if (firstKfWithPos && firstKfWithPos.position && time < firstKfWithPos.time ) {
                    finalPosition = { ...firstKfWithPos.position };
                }
            }
        }
        return { position: finalPosition, quaternion: finalQuaternion };
    }

    animate() {
        const THREE = GlobalTHREE; 
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this)); 
        if (!this.renderer || !this.scene || !this.camera) return; 

        const deltaTime = this.clock.getDelta();
        let isGizmoCurrentlyDragging = false;
        if (this.transformControls && this.transformControls.dragging && this.transformControls.object) {
            isGizmoCurrentlyDragging = true;
        }

        if (this.mixer && !isGizmoCurrentlyDragging) { 
            this.mixer.update(deltaTime);
            if (this.activeAction && this.activeAction.isRunning() && this.onTimeUpdateCallback) {
                let currentTimeInMixer = this.mixer.time;
                const clip = this.activeAction.getClip();
                if (clip) {
                    const clipDuration = clip.duration;
                    if (clipDuration && clipDuration > 0) { 
                        currentTimeInMixer = currentTimeInMixer % clipDuration; 
                    }
                    this.onTimeUpdateCallback(currentTimeInMixer);
                }
            }
        }
        
        if (this.controls) {
            this.controls.update(); 
        }

        if (this.model && this.boneMarkersGroup.children.length > 0 && this.boneMarkersGroup.visible) {
             this.updateBoneMarkerPositions(); 
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.onWindowResizeBound) {
            window.removeEventListener('resize', this.onWindowResizeBound);
            this.onWindowResizeBound = null;
        }
        if (this.onMouseClickBound && this.renderer && this.renderer.domElement) {
            this.renderer.domElement.removeEventListener('click', this.onMouseClickBound);
            this.onMouseClickBound = null;
        }
        
        this.clearModel(); 

        if (this.transformControls) {
            this.transformControls.dispose(); 
            if(this.scene && this.scene.children.includes(this.transformControls)) {
                this.scene.remove(this.transformControls); 
            }
            this.transformControls = null;
        }
        if (this.controls) { 
            this.controls.dispose();
            this.controls = null;
        }
        
        if (this.markerGeometry) this.markerGeometry.dispose();
        if (this.defaultMarkerMaterial) this.defaultMarkerMaterial.dispose();
        if (this.selectedMarkerMaterial) this.selectedMarkerMaterial.dispose();

        if (this.scene) {
            if(this.scene.children.includes(this.boneMarkersGroup)){
                 this.scene.remove(this.boneMarkersGroup);
            }
            const childrenToRemove = [...this.scene.children]; 
            childrenToRemove.forEach(child => {
                if (child !== this.model && child !== this.skeletonHelper && child !== this.transformControls && child !== this.boneMarkersGroup) { 
                    this.scene.remove(child);
                    if(child.geometry) child.geometry.dispose();
                    if(child.material) {
                        if(Array.isArray(child.material)){
                            child.material.forEach(m=>m?.dispose());
                        } else {
                            child.material?.dispose();
                        }
                    }
                }
            });
            this.scene = null; 
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentElement) {
                 this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }
        
        this.camera = null; 
    }
}

export default SceneManager;