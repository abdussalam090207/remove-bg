        let originalFile = null;
        let processedImageData = null;
        let processedBlob = null;
        let currentBgColor = '#ffffff';

        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();

            setTimeout(() => {
                if (window.removeBackground) {
                    console.log('✅ Library loaded successfully');
                    showToast('success', 'Aplikasi siap digunakan!');
                } else {
                    console.error('❌ Library failed to load');
                    showToast('error', 'Library gagal dimuat. Silakan refresh halaman.');
                }
            }, 2000);
        });

        function setupEventListeners() {
            const fileInput = document.getElementById('fileInput');
            fileInput.addEventListener('change', handleFileSelect);

            const uploadArea = document.getElementById('uploadArea');
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleDrop);

            const bgColorPicker = document.getElementById('bgColorPicker');
            bgColorPicker.addEventListener('change', (e) => {
                currentBgColor = e.target.value;
                updatePresetActive(currentBgColor);
                if (processedImageData) {
                    applyBackground();
                }
            });

            document.querySelectorAll('.preset-color').forEach(preset => {
                preset.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    if (color === 'transparent') {
                        currentBgColor = 'transparent';
                    } else if (color.startsWith('gradient')) {
                        currentBgColor = color;
                    } else {
                        currentBgColor = color;
                        document.getElementById('bgColorPicker').value = color;
                    }
                    updatePresetActive(color);
                    if (processedImageData) {
                        applyBackground();
                    }
                });
            });

            document.getElementById('resetBtn').addEventListener('click', resetApp);
            document.getElementById('processBtn').addEventListener('click', processImage);
            document.getElementById('downloadBtn').addEventListener('click', downloadImage);

            setupCompareSlider();
        }

        function updatePresetActive(color) {
            document.querySelectorAll('.preset-color').forEach(preset => {
                preset.classList.remove('active');
                if (preset.dataset.color === color) {
                    preset.classList.add('active');
                }
            });
        }

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                validateAndLoadFile(file);
            }
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                validateAndLoadFile(files[0]);
            }
        }

        function validateAndLoadFile(file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('error', 'Mohon pilih file gambar yang valid!');
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                showToast('error', 'Ukuran file maksimal 10MB!');
                return;
            }

            originalFile = file;
            loadImagePreview(file);
        }

        function loadImagePreview(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('originalImage').src = e.target.result;
                document.getElementById('processedImage').src = e.target.result;

                // Switch views
                document.getElementById('uploadSection').style.display = 'none';
                document.getElementById('processingSection').style.display = 'block';

                showToast('success', 'Foto berhasil diupload!');
            };
            reader.readAsDataURL(file);
        }

        async function processImage() {
            if (!originalFile) {
                showToast('error', 'Silakan upload foto terlebih dahulu!');
                return;
            }

            showLoading(true);

            try {
                console.log('Uploading to Cloudinary...');

                // Cloudinary Configuration
                const CLOUD_NAME = 'dxmulzmkd';
                const UPLOAD_PRESET = 'bg_remover'; // GANTI dengan preset name yang Anda buat

                // Create form data
                const formData = new FormData();
                formData.append('file', originalFile);
                formData.append('upload_preset', UPLOAD_PRESET);

                // Upload to Cloudinary
                const uploadResponse = await fetch(
                    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                    {
                        method: 'POST',
                        body: formData
                    }
                );

                if (!uploadResponse.ok) {
                    throw new Error('Upload failed');
                }

                const uploadData = await uploadResponse.json();
                console.log('Upload successful:', uploadData.public_id);

                // Apply background removal transformation
                const publicId = uploadData.public_id;
                const processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_background_removal/${publicId}.png`;

                console.log('Processing with Cloudinary...');

                // Load processed image
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    console.log('Processed image loaded');

                    // Create canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d', { alpha: true });

                    // Draw image
                    ctx.drawImage(img, 0, 0);

                    // Store image data
                    processedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // Apply background
                    applyBackground();

                    // Show success
                    showLoading(false);
                    showToast('success', 'Background berhasil dihapus!');
                    document.getElementById('downloadBtn').style.display = 'flex';
                };

                img.onerror = () => {
                    console.error('Error loading processed image');
                    showLoading(false);
                    showToast('error', 'Gagal memuat gambar hasil. Tunggu beberapa detik dan coba lagi.');
                };

                // Add delay to ensure Cloudinary finished processing
                setTimeout(() => {
                    img.src = processedUrl;
                }, 3000);

            } catch (error) {
                console.error('Error:', error);
                showLoading(false);

                let errorMsg = 'Gagal memproses gambar. ';

                if (error.message.includes('Upload failed')) {
                    errorMsg += 'Gagal upload ke Cloudinary. Periksa Upload Preset settings.';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMsg += 'Periksa koneksi internet Anda.';
                } else {
                    errorMsg += 'Silakan coba lagi.';
                }

                showToast('error', errorMsg);
            }
        }

        function applyBackground() {
            if (!processedImageData) return;

            const canvas = document.createElement('canvas');
            canvas.width = processedImageData.width;
            canvas.height = processedImageData.height;
            const ctx = canvas.getContext('2d', { alpha: true });

            // STEP 1: Draw background color/gradient FIRST
            if (currentBgColor !== 'transparent') {
                if (currentBgColor === 'gradient1') {
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#667eea');
                    gradient.addColorStop(1, '#764ba2');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (currentBgColor === 'gradient2') {
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#f093fb');
                    gradient.addColorStop(1, '#f5576c');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    ctx.fillStyle = currentBgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }

            // STEP 2: Create temporary canvas for processed image with transparency
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = processedImageData.width;
            tempCanvas.height = processedImageData.height;
            const tempCtx = tempCanvas.getContext('2d', { alpha: true });

            // Put processed image data (with transparency) on temp canvas
            tempCtx.putImageData(processedImageData, 0, 0);

            // STEP 3: Draw processed image on top of background (preserves alpha channel)
            ctx.drawImage(tempCanvas, 0, 0);

            // STEP 4: Update display with high quality
            const dataURL = canvas.toDataURL('image/png', 1.0);
            document.getElementById('processedImage').src = dataURL;
        }

        function setupCompareSlider() {
            const slider = document.getElementById('compareSlider');
            const overlay = document.getElementById('compareOverlay');
            const container = document.getElementById('compareContainer');
            let isSliding = false;

            slider.addEventListener('mousedown', startSlide);
            document.addEventListener('mousemove', slide);
            document.addEventListener('mouseup', stopSlide);

            // Touch events for mobile
            slider.addEventListener('touchstart', startSlide);
            document.addEventListener('touchmove', slideTouch);
            document.addEventListener('touchend', stopSlide);

            function startSlide(e) {
                e.preventDefault();
                isSliding = true;
            }

            function slide(e) {
                if (!isSliding) return;

                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = (x / rect.width) * 100;

                updateSliderPosition(percentage);
            }

            function slideTouch(e) {
                if (!isSliding) return;

                const rect = container.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                const percentage = (x / rect.width) * 100;

                updateSliderPosition(percentage);
            }

            function updateSliderPosition(percentage) {
                const clamped = Math.max(0, Math.min(100, percentage));
                slider.style.left = clamped + '%';
                overlay.style.width = clamped + '%';
            }

            function stopSlide() {
                isSliding = false;
            }
        }

        function downloadImage() {
            if (!processedImageData) {
                showToast('error', 'Tidak ada gambar untuk didownload!');
                return;
            }

            // Add download animation
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.classList.add('downloading');

            // Create high quality canvas with background
            const canvas = document.createElement('canvas');
            canvas.width = processedImageData.width;
            canvas.height = processedImageData.height;
            const ctx = canvas.getContext('2d', { alpha: true });

            // STEP 1: Draw background color/gradient FIRST
            if (currentBgColor !== 'transparent') {
                if (currentBgColor === 'gradient1') {
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#667eea');
                    gradient.addColorStop(1, '#764ba2');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (currentBgColor === 'gradient2') {
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#f093fb');
                    gradient.addColorStop(1, '#f5576c');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    ctx.fillStyle = currentBgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }

            // STEP 2: Create temporary canvas for processed image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = processedImageData.width;
            tempCanvas.height = processedImageData.height;
            const tempCtx = tempCanvas.getContext('2d', { alpha: true });

            // Put processed image data on temp canvas
            tempCtx.putImageData(processedImageData, 0, 0);

            // STEP 3: Draw processed image on top of background
            ctx.drawImage(tempCanvas, 0, 0);

            // STEP 4: Convert to blob with maximum quality and download
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.download = 'Foto-telah-remove-bg-' + Date.now() + '.png';
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);

                // Remove animation after delay
                setTimeout(() => {
                    downloadBtn.classList.remove('downloading');
                    showToast('success', 'Download berhasil!');
                }, 1000);
            }, 'image/png', 1.0);
        }

        function resetApp() {
            originalFile = null;
            processedImageData = null;
            processedBlob = null;
            currentBgColor = '#ffffff';

            document.getElementById('fileInput').value = '';
            document.getElementById('uploadSection').style.display = 'block';
            document.getElementById('processingSection').style.display = 'none';
            document.getElementById('downloadBtn').style.display = 'none';
            document.getElementById('bgColorPicker').value = '#ffffff';

            // Reset compare slider
            document.getElementById('compareSlider').style.left = '50%';
            document.getElementById('compareOverlay').style.width = '50%';

            // Reset preset active state
            updatePresetActive('#ffffff');

            showToast('success', 'Siap untuk upload foto baru!');
        }

        function showLoading(show) {
            const loadingOverlay = document.getElementById('loadingOverlay');
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }

        function showToast(type, message) {
            const toast = document.getElementById('toast');
            const icon = toast.querySelector('.toast-icon');
            const msgElement = toast.querySelector('.toast-message');

            // Reset classes
            toast.className = 'toast';
            toast.classList.add(type);

            // Set content
            icon.textContent = type === 'success' ? '✅' : '❌';
            msgElement.textContent = message;

            // Show toast
            toast.style.display = 'flex';

            // Auto hide after 3 seconds
            setTimeout(() => {
                hideToast();
            }, 3000);
        }

        function hideToast() {
            const toast = document.getElementById('toast');
            toast.style.display = 'none';
        }

        // Check if library is loaded on page load
        // Check if library is loaded on page load
        window.addEventListener('load', () => {
            console.log('✅ Aplikasi siap digunakan dengan Cloudinary!');
            showToast('success', 'Aplikasi siap digunakan!');
        });
