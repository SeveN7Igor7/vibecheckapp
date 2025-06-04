const CLOUDINARY_CLOUD_NAME = "dxen2wreu";
const CLOUDINARY_UPLOAD_PRESET = "vibecheck_stories_unsigned";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Uploads an image file to Cloudinary using an unsigned preset.
 * @param {string} fileUri - The local URI of the image file (e.g., from expo-image-picker).
 * @param {string} fileType - The mime type of the file (e.g., 'image/jpeg').
 * @returns {Promise<string|null>} - The secure URL of the uploaded image, or null if upload fails.
 */
export const uploadImageToCloudinary = async (fileUri, fileType = 'image/jpeg') => {
  if (!fileUri) {
    console.error("Cloudinary Upload: No file URI provided.");
    return null;
  }

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: fileType,
    name: `story_${Date.now()}.jpg`, // Or generate a more unique name
  });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  console.log("Cloudinary Upload: Starting upload for", fileUri);

  try {
    const response = await fetch(CLOUDINARY_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Cloudinary Upload Error:", responseData);
      throw new Error(responseData.error?.message || 'Failed to upload image to Cloudinary');
    }

    console.log("Cloudinary Upload Success:", responseData);
    return responseData.secure_url || responseData.url || null;

  } catch (error) {
    console.error("Cloudinary Upload Exception:", error);
    return null;
  }
};

