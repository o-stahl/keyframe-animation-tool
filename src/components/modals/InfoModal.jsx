import React from 'react';

const InfoModal = ({ show, onClose }) => {
  if (!show) return null;

  const appName = "Keyframe Animation Tool";
  const githubLink = "https://github.com/o-stahl/keyframe-animation-tool.git"; 

  const GitHubIcon = ({ size = 16, color = "currentColor" }) => (
    <svg viewBox="0 0 16 16" fill={color} width={size} height={size} style={{ verticalAlign: 'middle' }}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
    </svg>
  );

  const CloseIcon = ({ size = 20, color = "#aaa" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        className="modal-content large"
        style={{ 
          padding: '0', 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '90vh',
          textAlign: 'left' 
        }}
      >
        {/* Fixed Header */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid #333',
            backgroundColor: '#2a2a2a', 
            flexShrink: 0,
            borderRadius: '8px 8px 0 0'
          }}
        >
          <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#e0e0e0' }}>
            {appName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <a 
              href={githubLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              title="View on GitHub"
              style={{ color: '#aaa', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#4a9eff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
            >
              <GitHubIcon size={18} />
            </a>
            <button 
              onClick={onClose} 
              title="Close"
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '0',
                color: '#aaa',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
            >
              <CloseIcon size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div 
          style={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            padding: '20px',
            color: '#e0e0e0'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img 
              src="/icon.svg" 
              alt={`${appName} Icon`} 
              style={{ width: '60px', height: '60px', margin: '0 auto 10px auto', display: 'block' }} 
            />
            <p style={{fontSize: '13px', color: '#bbb', margin: '5px 0 10px 0'}}>
              A tool for creating and editing keyframe animations for 3D models.
            </p>
            <p style={{fontSize: '13px', color: '#4a9eff', margin: '0 0 15px 0', fontWeight: '500'}}>
              Runs entirely in your web browser - no installation needed!
            </p>
          </div>

          <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginTop: '15px' }}>
            <h5 style={{ color: '#4a9eff', marginBottom: '10px', fontSize: '1em' }}>Getting Started:</h5>
            <ol style={{ paddingLeft: '20px', fontSize: '0.9em', lineHeight: '1.6', marginBottom: '20px' }}>
              <li>
                <strong>Load Base Model:</strong> Under the "Scene" tab, click "Choose FBX Model..." to load your 3D model (<code>.fbx</code> format).
              </li>
              <li>
                <strong>Setup/Load Animation:</strong>
                <ul style={{paddingLeft: '20px', listStyleType: 'circle', marginTop: '5px'}}>
                  <li>Set an "Animation Name" and "Duration".</li>
                  <li><em>Alternatively</em>, import an existing animation via "Import Animation File (FBX/GLB)" or "Import Keyframe JSON" if you have one for this model structure.</li>
                </ul>
              </li>
              <li>
                <strong>Switch to Animate Tab:</strong> Click the "Animate" tab.
              </li>
              <li>
                <strong>Select Bone:</strong> Choose a bone from the "Bones" list.
              </li>
              <li>
                <strong>Set Time:</strong> Use the timeline slider or the time input (top toolbar) to choose a time.
              </li>
              <li>
                <strong>Adjust Transform:</strong> Modify the bone's rotation using the "Rotation" controls or the gizmo in the viewport. (Position is read-only).
              </li>
              <li>
                <strong>Set Keyframe:</strong> Click "Set Key" (or press <code>S</code>/<code>K</code>).
              </li>
              <li>
                <strong>Repeat:</strong> Move to different times, adjust transforms, and set more keyframes.
              </li>
              <li>
                <strong>Preview:</strong> Use the play/pause buttons on the timeline (or <code>Spacebar</code>).
              </li>
              <li>
                <strong>Export:</strong>
                  <ul style={{paddingLeft: '20px', listStyleType: 'circle', marginTop: '5px'}}>
                      <li><strong>Export JSON:</strong> Saves animation data in KAT's format, ideal for saving work and re-importing into this tool.</li>
                      <li><strong>Export GLB:</strong> Exports the model with the animation embedded, suitable for use in other 3D software or game engines.</li>
                  </ul>
              </li>
            </ol>
          </div>
          
          <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginTop: '15px' }}>
            <h5 style={{ color: '#4a9eff', marginBottom: '10px', fontSize: '1em' }}>Keyboard Shortcuts:</h5>
            <ul style={{ paddingLeft: '20px', fontSize: '0.9em', lineHeight: '1.6', listStyleType: 'disc', marginBottom: '20px' }}>
              <li><code>Spacebar</code>: Play / Pause animation.</li>
              <li><code>S</code> or <code>K</code>: Set/Update keyframe for selected bone at current time.</li>
              <li><code>Delete</code> / <code>Backspace</code>: Delete keyframe for selected bone at current time.</li>
              <li><code>ArrowLeft</code>: Previous frame.</li>
              <li><code>ArrowRight</code>: Next frame.</li>
              <li><code>Shift + ArrowLeft</code>: Jump back 0.1 seconds.</li>
              <li><code>Shift + ArrowRight</code>: Jump forward 0.1 seconds.</li>
              <li><code>Home</code>: Go to start of timeline (0s).</li>
              <li><code>End</code>: Go to end of timeline (animation duration).</li>
            </ul>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #333' }}>
            <a 
              href={githubLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="button"
              style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <GitHubIcon size={16} color="white" /> <span style={{marginLeft: '8px'}}>View on GitHub</span>
            </a>
            <button className="button secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;