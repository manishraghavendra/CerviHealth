// Upload an image to Cloudinary using fetch (Expo compatible)
export const uploadImage = async (fileUri) => {
  const data = new FormData();
  data.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  });
  data.append('upload_preset', 'cervihealth_unsigned'); // your unsigned preset

  const res = await fetch('https://api.cloudinary.com/v1_1/dpgfhonkp/image/upload', {
    method: 'POST',
    body: data,
  });

  const result = await res.json();
  if (result.secure_url) {
    return result.secure_url;
  } else {
    throw new Error(result.error?.message || 'Cloudinary upload failed');
  }
};