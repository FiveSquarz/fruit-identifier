// Adapted from https://github.com/microsoft/onnxruntime-nextjs-template/tree/main/utils
import { getImageTensorFromPath } from './imageHelper';
import * as ort from 'onnxruntime-web';
import _ from 'lodash';
import classNames from '../data/classNames';

export async function inferenceModel(path: string): Promise<[any, number]> {
    const imageTensor = await getImageTensorFromPath(path);
    const session = await createSession("./Dec19_01.onnx")
    const [predictions, inferenceTime] = await runInference(session, imageTensor);
    return [predictions, inferenceTime]
}

async function createSession(onnxPath: string) : Promise<ort.InferenceSession> {
  ort.env.wasm.wasmPaths = "/fruit-identifier/wasm/";
  const session = await ort.InferenceSession.create(
    onnxPath, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
  );
  return session
}

async function runInference(session: ort.InferenceSession, preprocessedData: any): Promise<[any, number]> {
  // Get start time to calculate inference time.
  const start = new Date();
  // create feeds with the input name from model export and the preprocessed data.
  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = preprocessedData;
  
  // Run the session inference.
  const outputData = await session.run(feeds);
  // Get the end time to calculate inference time.
  const end = new Date();
  // Convert to seconds.
  const inferenceTime = (end.getTime() - start.getTime())/1000;
  // Get output results with the output name from the model export.
  const output = outputData[session.outputNames[0]];
  //Get the softmax of the output data. The softmax transforms values to be between 0 and 1
  var outputSoftmax = softmax(Array.prototype.slice.call(output.data));
  
  //Get the top 5 results.
  var results = classesTopK(outputSoftmax, 10);
  return [results, inferenceTime];
}

function softmax(resultArray: number[]): any {
  // Get the largest value in the array.
  const largestNumber = Math.max(...resultArray);
  // Apply exponential function to each result item subtracted by the largest number, use reduce to get the previous result number and the current number to sum all the exponentials results.
  const sumOfExp = resultArray.map(resultItem => Math.exp(resultItem - largestNumber)).reduce((prevNumber, currentNumber) => prevNumber + currentNumber);
  //Normalizes the resultArray by dividing by the sum of all exponentials; this normalization ensures that the sum of the components of the output vector is 1.
  return resultArray.map(resultValue => {
    return Math.exp(resultValue - largestNumber) / sumOfExp;
  });
}


export function classesTopK(classProbabilities: number[], k: number) {
  const probs =
      _.isTypedArray(classProbabilities) ? Array.prototype.slice.call(classProbabilities) : classProbabilities;

  const sorted = _.sortBy(probs.map((prob: number, index: number) => [prob, index]), (probIndex: number[]) => -probIndex[0]);

  const topK = _.take(sorted, k).map((probIndex: number[]) => {
    return {
      index: parseInt(probIndex[1].toString(), 10),
      name: classNames[probIndex[1]],
      probability: probIndex[0]
    };
  });
  return topK;
}
