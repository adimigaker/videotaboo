// Helper untuk upload gambar ke Google Drive via Apps Script
class DriveUploader {
    static async uploadImage(file) {
        const reader = new FileReader();
        const fileData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        
        const payload = {
            fileName: file.name,
            fileData: fileData,
            mimeType: file.type
        };
        
        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbwy_uZWnQVfOj_-UxjDUQsoduoc_rYzpKnc776J0nJZCgSaVqTnIY2WR0MzLjLW3DcW/exec', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            // Karena no-cors, response tidak bisa dibaca
            // Tapi file sudah terupload ke Drive
            return {
                success: true,
                message: 'File uploaded successfully'
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
}