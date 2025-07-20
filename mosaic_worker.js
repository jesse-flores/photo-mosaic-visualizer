let sourceImageColorCache = [];

function getAverageColor(imageData) {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }
    const pixelCount = data.length / 4;
    return {
        r: Math.floor(r / pixelCount),
        g: Math.floor(g / pixelCount),
        b: Math.floor(b / pixelCount)
    };
}

function findBestMatchLimistedAmount(targetColor) {
    let bestMatch = null;
    let minDistance = Infinity;

    for (const source of sourceImageColorCache) {
        // Euclidean distance squared (faster than with sqrt)
        const distance = Math.pow(targetColor.r - source.avgColor.r, 2) +
            Math.pow(targetColor.g - source.avgColor.g, 2) +
            Math.pow(targetColor.b - source.avgColor.b, 2);

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = source;
        }
    }
    return bestMatch;
}

// Main message handler for the worker
self.onmessage = function (e) {
    const { type, payload } = e.data;

    if (type === 'ANALYZE_SOURCES') {
        sourceImageColorCache = [];
        const sources = payload.sourceImages;
        const total = sources.length;

        sources.forEach((imgData, index) => {
            const avgColor = getAverageColor(imgData.data);
            sourceImageColorCache.push({ id: imgData.id, avgColor });

            if ((index + 1) % 10 === 0 || index + 1 === total) {
                self.postMessage({ type: 'PROGRESS', payload: { label: `Analyzing source images...`, value: ((index + 1) / total) * 100, text: `${index + 1} / ${total}` } });
            }
        });
        self.postMessage({ type: 'ANALYSIS_COMPLETE' });
    }

    if (type === 'GENERATE_MOSAIC') {
        const { targetBitmap, tileWidth, tileHeight } = payload;
        const mosaicLayout = [];
        const targetWidth = targetBitmap.width;
        const targetHeight = targetBitmap.height;

        const cols = Math.floor(targetWidth / tileWidth);
        const rows = Math.floor(targetHeight / tileHeight);
        const totalTiles = cols * rows;

        // Use an OffscreenCanvas for processing to avoid DOM interaction
        const tempCanvas = new OffscreenCanvas(tileWidth, tileHeight);
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const startX = x * tileWidth;
                const startY = y * tileHeight;

                // Get average color of the target tile
                tempCtx.clearRect(0, 0, tileWidth, tileHeight);
                tempCtx.drawImage(targetBitmap, startX, startY, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
                const tileImageData = tempCtx.getImageData(0, 0, tileWidth, tileHeight);
                const tileAvgColor = getAverageColor(tileImageData);
                const bestMatch = findBestMatchLimistedAmount(tileAvgColor);

                if (bestMatch) {
                    mosaicLayout.push({
                        sourceId: bestMatch.id,
                        x: startX,
                        y: startY,
                        tileColor: tileAvgColor
                    });
                }
            }
            const processed = (y * cols) + cols;
            self.postMessage({ type: 'PROGRESS', payload: { label: 'Building mosaic...', value: (processed / totalTiles) * 100, text: `${processed} / ${totalTiles} tiles` } });
        }

        self.postMessage({ type: 'MOSAIC_COMPLETE', payload: { mosaicLayout, tileWidth, tileHeight, finalWidth: cols * tileWidth, finalHeight: rows * tileHeight } });
    }
};