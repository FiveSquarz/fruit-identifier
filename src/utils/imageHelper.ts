import { Jimp } from 'jimp';
import { Tensor } from 'onnxruntime-web';

export async function getImageTensorFromPath(path: string, dims: number[] =  [1, 3, 224, 224]): Promise<Tensor> {
  // 1. load the image  
  var image = await loadImageFromPath(path, dims[2], dims[3]);
  // 2. convert to tensor
  var imageTensor = imageDataToTensor(image, dims);
  // 3. return the tensor
  return imageTensor;
}

async function loadImageFromPath(path: string, width: number = 224, height: number= 224): Promise<any> {
  // Use Jimp to load the image and resize it.
  var imageData = await Jimp.read(path)
  imageData.resize({w: width, h: height})
  return imageData;
}

function imageDataToTensor(image: any, dims: number[]): Tensor {
  const mean= [0.5488, 0.5056, 0.3494]
  const std= [0.2189, 0.2199, 0.2283]

  // 1. Get buffer data from image and create R, G, and B arrays.
  var imageBufferData = image.bitmap.data;
  const [redArray, greenArray, blueArray] = new Array(new Array<number>(), new Array<number>(), new Array<number>());

  // 2. Loop through the image buffer and extract the R, G, and B channels
  for (let i = 0; i < imageBufferData.length; i += 4) {
    redArray.push((imageBufferData[i] / 255.0 - mean[0]) / std[0]);
    greenArray.push((imageBufferData[i + 1] / 255.0 - mean[1]) / std[1]);
    blueArray.push((imageBufferData[i + 2] / 255.0 - mean[2]) / std[2]);
    // skip data[i + 3] to filter out the alpha channel
  }

  // 3. Concatenate RGB to transpose [224, 224, 3] -> [3, 224, 224] to a number array
  const transposedData = redArray.concat(greenArray).concat(blueArray);

  // 4. convert to float32
  const float32Data = new Float32Array(transposedData);

  // 5. create the tensor object from onnxruntime-web.
  const inputTensor = new Tensor("float32", float32Data, dims);
  return inputTensor;
}

