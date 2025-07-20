# Photo Mosaic Generator


A client-side web application that creates a stunning photo mosaic from a target image using a library of your own source pictures. All image processing happens directly in your browser, ensuring your photos remain private.


---


## Live Demo


[**Try the Photo Mosaic Generator here!**](https://jesse-flores.github.io/Jesse-EE-CS.github.io/mosaic_visualizer.html)


---


## Features


* **Entirely Client-Side:** No images are uploaded to a server. All processing is done in your browser using JavaScript.
* **Custom Target Image:** Upload any image you want to recreate as a mosaic.
* **Custom Source Library:** Use your own collection of photos as the tiles for the mosaic.
* **Adjustable Tile Size:** Control the granularity of the mosaic by changing the size of the tile images.
* **Color Blending:** An optional overlay to blend the original tile colors with the source images, making the final mosaic more closely resemble the target image.
* **Non-Blocking UI:** Uses a **Web Worker** for heavy computations, so the user interface remains responsive throughout the process.
* **Real-time Progress:** A progress bar keeps you updated during the analysis and generation phases.
* **Download Result:** Save your final mosaic creation as a high-quality PNG file.


---


## Local Setup


This project is fully client-side and requires no special installation or build steps.


1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jesse-flores/photo-mosaic-visualizer.git
    ```
2.  **Navigate to the directory:**
    ```bash
    cd photo-mosaic-generator
    ```
3.  **Open the file:**
    * Simply open the `index.html` file in a modern web browser like Chrome, Firefox, or Edge.


---


## How to Use


1.  **Upload Target Image:** Click `Upload Target Image` to select the main picture you want to recreate. A preview will be shown.
2.  **Upload Source Library:** Click `Upload Source Library` to select the smaller images that will be used as tiles. You can select multiple files at once.
3.  **Configure Mosaic:**
    * Adjust the **Tile Size** slider to set the dimensions for each tile image. Smaller tiles create a more detailed mosaic but require more processing.
    * Adjust the **Color Blending** slider to control how much of the original target image's color is applied over each tile.
4.  **Generate:** Click the `Generate Mosaic` button.
5.  **Wait:** The application will first analyze the average color of all source images and then build the mosaic tile by tile. You can follow the progress on the screen.
6.  **Download:** Once the process is complete, the final mosaic will appear. Click `Download Image` to save it to your computer.


---


## How It Works


The application's logic is split between the main UI thread and a background Web Worker to ensure a smooth user experience.


1.  **Source Image Analysis (Worker Thread):**
    * When you click "Generate," the source images are sent to the Web Worker.
    * The worker analyzes each source image to calculate its average RGB color. These average colors are cached for quick access.
    * The process of calculating the average color for an image with pixel data $(R_i, G_i, B_i)$ for $N$ pixels is:
        $$R_{avg} = \frac{1}{N} \sum_{i=1}^{N} R_i, \quad G_{avg} = \frac{1}{N} \sum_{i=1}^{N} G_i, \quad B_{avg} = \frac{1}{N} \sum_{i=1}^{N} B_i$$


2.  **Mosaic Generation (Worker Thread):**
    * The target image is divided into a grid based on the selected **tile size**.
    * For each cell in the grid, the worker calculates the average color of that region in the target image.
    * It then finds the best-matching source image by comparing the tile's average color to the cached average colors of the source library. The "best" match is the one with the minimum color difference, calculated using the **Euclidean distance** in the RGB color space. For two colors $(R_1, G_1, B_1)$ and $(R_2, G_2, B_2)$, the squared distance is:
        $$d^2 = (R_1 - R_2)^2 + (G_1 - G_2)^2 + (B_1 - B_2)^2$$
        *(The square root is skipped for performance, as it doesn't change the outcome of the comparison.)*
    * The worker creates a complete `mosaicLayout` map and sends it back to the main thread.


3.  **Rendering (Main Thread):**
    * The main script receives the `mosaicLayout` from the worker.
    * It draws the final image onto an HTML5 `<canvas>` element by placing the best-matched source image into its corresponding tile position.
    * If **Color Blending** is enabled, it draws a semi-transparent color overlay on each tile to complete the effect.


---


## Technologies Used


* **HTML5:** For the page structure and elements like `<canvas>`.
* **CSS3:** For styling the user interface.
* **JavaScript:** For all the client-side logic.
* **Web Workers API:** To run intensive image analysis and mosaic generation in a background thread, preventing the UI from freezing.
* **HTML5 Canvas API:** To draw and render the final mosaic image.
* **File Reader API:** To read user-selected local image files.


---


## Future Improvements


* **Advanced Tile Matching:** Implement an option to prevent the same source image from being used too frequently or in adjacent tiles to create a more varied and less repetitive mosaic.
* **UI/UX Enhancements:**
    * Add drag-and-drop support for uploading images.
    * Show a gallery preview of the uploaded source images.
* **Performance:** For extremely large mosaics, explore using **WebGL** for rendering, which could offer significant performance gains by leveraging the GPU.
* **Save/Load Configuration:** Allow users to save their current settings (tile size, blending, etc.) and source image list to reuse later.


---


## License


This project is open source and available under the [MIT License](LICENSE).



