// DOM Elements
const targetImageInput = document.getElementById('target-image-input');
const targetImagePreview = document.getElementById('target-image-preview');
const targetPreviewContainer = document.getElementById('target-preview');
const sourceImagesInput = document.getElementById('source-images-input');
const sourceImageCount = document.getElementById('source-image-count');
const tileSizeSlider = document.getElementById('tile-size');
const tileSizeValue = document.getElementById('tile-size-value');
const blendingSlider = document.getElementById('blending');
const blendingValue = document.getElementById('blending-value');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const mosaicCanvas = document.getElementById('mosaic-canvas');
const canvasContainer = document.getElementById('canvas-container');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const progressText = document.getElementById('progress-text');
const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');
const closeModalBtn = document.getElementById('close-modal-btn');

let targetImageFile = null;
let sourceImageFiles = [];
let sourceImageBitmaps = [];
let worker;

// Error Handling
function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.remove('hidden');
}

function updateButtonState() {
    generateBtn.disabled = !targetImageFile || sourceImageFiles.length === 0;
}

// Web Worker Setup
function initializeWorker() {
    try {
        worker = new Worker('mosaic_worker.js');

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            switch (type) {
                case 'PROGRESS':
                    progressLabel.textContent = payload.label;
                    progressBar.value = payload.value;
                    progressText.textContent = payload.text;
                    break;
                case 'ANALYSIS_COMPLETE':
                    generateMosaic();
                    break;
                case 'MOSAIC_COMPLETE':
                    drawMosaic(payload);
                    break;
                case 'ERROR':
                    showError(payload.message);
                    resetUI();
                    break;
            }
        };
        worker.onerror = (e) => {
            console.error('Worker error:', e);
            showError(`An error occurred in the processing thread. Please check console for details.`);
            resetUI();
        };
    } catch (err) {
        console.error('Failed to initialize web worker:', err);
        showError('Your browser does not support a feature required for this app (Web Workers). Please try a different browser.');
    }
}

// Event Listening
targetImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        targetImageFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            targetImagePreview.src = event.target.result;
            targetPreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        targetImageFile = null;
        targetPreviewContainer.classList.add('hidden');
        if (file) showError('Please select a valid image file for the target.');
    }
    updateButtonState();
});

sourceImagesInput.addEventListener('change', (e) => {
    sourceImageFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    sourceImageCount.textContent = `${sourceImageFiles.length} image(s) selected.`;
    if (e.target.files.length > 0 && sourceImageFiles.length === 0) {
        showError('Some selected files were not valid images and have been ignored.');
    }
    updateButtonState();
});

tileSizeSlider.addEventListener('input', (e) => {
    tileSizeValue.textContent = e.target.value;
});

blendingSlider.addEventListener('input', (e) => {
    blendingValue.textContent = Math.round(e.target.value * 100);
});

generateBtn.addEventListener('click', () => {
    if (!targetImageFile || sourceImageFiles.length === 0) {
        showError('Please select a target image and at least one source image.');
        return;
    }
    startMosaicProcess();
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'photo-mosaic.png';
    link.href = mosaicCanvas.toDataURL('image/png');
    link.click();
});

closeModalBtn.addEventListener('click', () => {
    errorModal.classList.add('hidden');
});

// Image Sorting and Positioning Logic
async function startMosaicProcess() {
    generateBtn.disabled = true;
    downloadBtn.classList.add('hidden');
    mosaicCanvas.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressLabel.textContent = 'Preparing images...';
    progressBar.value = 0;
    progressText.textContent = '';

    try {
        // 1. Load source images into memory and get their data
        progressLabel.textContent = 'Loading source images...';
        const sourceImageDataPromises = sourceImageFiles.map((file, i) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        // Standardize source images for faster analysis
                        const tempCanvas = new OffscreenCanvas(50, 50);
                        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                        tempCtx.drawImage(img, 0, 0, 50, 50);
                        const imageData = tempCtx.getImageData(0, 0, 50, 50);
                        resolve({ id: i, data: imageData });
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        const sourceImageDatas = await Promise.all(sourceImageDataPromises);

        // Load them as bitmaps for final drawing
        sourceImageBitmaps = await Promise.all(sourceImageFiles.map(f => createImageBitmap(f)));

        // 2. Send to worker for analysis
        worker.postMessage({
            type: 'ANALYZE_SOURCES',
            payload: { sourceImages: sourceImageDatas }
        });

    } catch (err) {
        console.error('Error during image preparation:', err);
        showError('Could not process the source images. One or more files might be corrupted.');
        resetUI();
    }
}

async function generateMosaic() {
    try {
        // 3. Load target image and send to worker
        const targetBitmap = await createImageBitmap(targetImageFile);

        // Pass the ImageBitmap to the worker. It's a transferable object.
        worker.postMessage({
            type: 'GENERATE_MOSAIC',
            payload: {
                targetBitmap,
                tileWidth: parseInt(tileSizeSlider.value, 10),
                tileHeight: parseInt(tileSizeSlider.value, 10)
            }
        }, [targetBitmap]); // Transfer ownership to the worker for efficiency
    } catch (err) {
        console.error('Error during mosaic generation:', err);
        showError('Could not process the target image.');
        resetUI();
    }
}

function drawMosaic({ mosaicLayout, tileWidth, tileHeight, finalWidth, finalHeight }) {
    progressLabel.textContent = 'Rendering final image...';
    progressText.textContent = 'This may take a moment.';

    mosaicCanvas.width = finalWidth;
    mosaicCanvas.height = finalHeight;
    const ctx = mosaicCanvas.getContext('2d');
    ctx.clearRect(0, 0, finalWidth, finalHeight);

    const blending = parseFloat(blendingSlider.value);

    mosaicLayout.forEach(tile => {
        const sourceBitmap = sourceImageBitmaps[tile.sourceId];
        if (sourceBitmap) {
            ctx.drawImage(sourceBitmap, tile.x, tile.y, tileWidth, tileHeight);
            if (blending > 0) {
                ctx.fillStyle = `rgba(${tile.tileColor.r}, ${tile.tileColor.g}, ${tile.tileColor.b}, ${blending})`;
                ctx.fillRect(tile.x, tile.y, tileWidth, tileHeight);
            }
        }
    });

    progressContainer.classList.add('hidden');
    mosaicCanvas.classList.remove('hidden');
    downloadBtn.classList.remove('hidden');
    generateBtn.disabled = false;
}

function resetUI() {
    generateBtn.disabled = false;
    progressContainer.classList.add('hidden');
    updateButtonState();
}

// Initialize everything
initializeWorker();
updateButtonState();