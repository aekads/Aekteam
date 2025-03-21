const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "employee_uploads",
        format: async (req, file) => "png", // Convert all files to PNG
        public_id: (req, file) => `${Date.now()}-${file.originalname}`
    }
});

const upload = require('multer')({ storage });

module.exports = { cloudinary, upload };



                                                                                


