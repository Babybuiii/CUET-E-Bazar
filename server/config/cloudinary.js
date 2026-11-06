require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const isRealValue = (v) => Boolean(v && typeof v === 'string' && v.trim() && !v.includes('your_') && !v.includes('<') && v !== 'yycr5ehf');

const rawCloud = process.env.CLOUDINARY_CLOUD_NAME;
const rawKey   = process.env.CLOUDINARY_API_KEY;
const rawSec   = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = isRealValue(rawCloud) && isRealValue(rawKey) && isRealValue(rawSec);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: rawCloud.trim(),
    api_key: rawKey.trim(),
    api_secret: rawSec.trim()
  });
}

// ── Product & giveaway image storage ──────────────────────────────────────────
let storage;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'ebazar/products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      transformation: [
        { quality: 'auto:best' },
        { fetch_format: 'auto' },
        { width: 1600, crop: 'limit' }
      ]
    }
  });
} else {
  storage = multer.memoryStorage();
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files (JPG, PNG, WebP) are allowed.'), false);
    }
    cb(null, true);
  }
});

// ── Avatar storage (400×400 square face-crop) ─────────────────────────────────
let avatarStorage;

if (isCloudinaryConfigured) {
  avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'ebazar/avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    }
  });
} else {
  avatarStorage = multer.memoryStorage();
}

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for avatars.'), false);
    }
    cb(null, true);
  }
});

module.exports = {
  cloudinary,
  upload,
  uploadAvatar,
  isCloudinaryConfigured
};
