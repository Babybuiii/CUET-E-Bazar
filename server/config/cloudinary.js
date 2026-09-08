require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'yycr5ehf';
const apiKey = process.env.CLOUDINARY_API_KEY || '717351537846877';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'ZJqiiDdA-kPr0nDSI32d5Lx_4BQ';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

// ── Product image storage ─────────────────────────────────────────────────────
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

// ── Shop branding storage (logo + cover banner) ───────────────────────────────
// One multer instance handles both fields; Cloudinary crops each by field name.
let shopStorage;

if (isCloudinaryConfigured) {
  shopStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const isLogo = file.fieldname === 'logo';
      return {
        folder: isLogo ? 'ebazar/shops/logos' : 'ebazar/shops/banners',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
        transformation: isLogo
          ? [
              { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          : [
              { width: 1600, height: 400, crop: 'fill', gravity: 'auto' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
      };
    }
  });
} else {
  shopStorage = multer.memoryStorage();
}

const uploadShopImages = multer({
  storage: shopStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files (JPG, PNG, WebP) are allowed.'), false);
    }
    cb(null, true);
  }
});

module.exports = {
  cloudinary,
  upload,
  uploadAvatar,
  uploadShopImages,
  isCloudinaryConfigured
};
