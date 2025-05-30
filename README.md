# Keyframe Animation Tool

A web-based tool for creating and editing skeletal keyframe animations for 3D models in FBX format. Export your animations in a compatible JSON format or as a GLB file with embedded animation.

![Keyframe Animation Tool Screenshot](screenshot.png)

## Features

*   Load FBX models and inspect their bone structure.
*   Create and edit keyframes for bone rotations on a visual timeline.
*   Adjust animation name and duration.
*   Real-time 3D viewport with orbit controls and bone selection gizmos.
*   Import animations from FBX/GLB files or from the tool's JSON format.
*   Export animations to JSON (for re-importing into this tool) or GLB (for use in other 3D applications/engines).
*   Keyboard shortcuts for efficient animation workflow.
*   Responsive UI design.

## Getting Started

### Prerequisites

*   Node.js (v16 or newer recommended)
*   npm (comes with Node.js)

### Installation & Running Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/o-stahl/keyframe-animation-tool.git
    cd keyframe-animation-tool
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, and the application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

### Building for Production

To create a production build:

```bash
npm run build
```

The optimized static assets will be placed in the `dist` directory. You can then serve this directory using any static file server.

## How to Use

1.  **Load Model:**
    *   Navigate to the "Scene" tab.
    *   Click "Choose FBX Model..." and select your `.fbx` file.
    *   The model will load in the viewport, and its bones will be listed.

2.  **Animation Setup:**
    *   Optionally, set an "Animation Name" and "Duration" for your new animation.
    *   Alternatively, import an existing animation using "Import Animation File (FBX/GLB)" or "Import Keyframe JSON".

3.  **Animate:**
    *   Switch to the "Animate" tab.
    *   **Select Bone:** Click a bone name from the "Bones" list. A gizmo will appear on the selected bone in the viewport.
    *   **Set Time:** Use the timeline slider at the bottom or the time input field in the top toolbar to go to a specific time.
    *   **Transform Bone:**
        *   Use the "Rotation" input fields in the "Transform" panel.
        *   Or, click and drag the rotation gizmo in the 3D viewport.
        *   (Note: Bone position is currently read-only and derived from the model's bind pose.)
    *   **Set Keyframe:** Click the "Set Key" button (or press `S` or `K`). If a keyframe already exists at the current time for the selected bone, it will be updated.
    *   Repeat by moving to different times, adjusting transforms, and setting more keyframes.

4.  **Preview Animation:**
    *   Use the play/pause/stop buttons on the timeline.
    *   Press `Spacebar` to play or pause.

5.  **Export:**
    *   **Export JSON:** Saves the animation data in the tool's native JSON format. This is useful for saving your work and re-importing it later into this tool with the same model.
    *   **Export GLB:** Exports the current model along with the created animation embedded within a `.glb` file. This format is widely supported by game engines and 3D software.

6.  **View JSON / Info:**
    *   Click "View JSON" in the top toolbar to see the raw animation data.
    *   Click "Info" for a summary of features and keyboard shortcuts.

## Keyboard Shortcuts

*   `Spacebar`: Play / Pause animation.
*   `S` or `K`: Set/Update keyframe for selected bone at current time.
*   `Delete` / `Backspace`: Delete keyframe for selected bone at current time.
*   `ArrowLeft`: Previous frame.
*   `ArrowRight`: Next frame.
*   `Shift + ArrowLeft`: Jump back 0.1 seconds.
*   `Shift + ArrowRight`: Jump forward 0.1 seconds.
*   `Home`: Go to start of timeline (0s).
*   `End`: Go to end of timeline (animation duration).

## Technologies Used

*   React
*   Three.js
*   Vite

## License

This project is open source and available under the MIT License.