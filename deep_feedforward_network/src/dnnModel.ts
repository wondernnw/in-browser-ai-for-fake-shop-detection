import * as tf from "@tensorflow/tfjs-node";
import { performance } from "perf_hooks";

// Function to shuffle and split data into training and testing sets
export async function shuffleAndSplitData(
  features: tf.Tensor,
  labels: tf.Tensor,
  testSize: number = 0.2,
): Promise<{
  trainFeatures: tf.Tensor;
  testFeatures: tf.Tensor;
  trainLabels: tf.Tensor;
  testLabels: tf.Tensor;
}> {
  // Convert tensors to arrays
  const featuresArray = (await features.array()) as number[][];
  const labelsArray = (await labels.array()) as number[];

  // Validate shapes
  if (featuresArray.length !== labelsArray.length) {
    throw new Error(
      "Features and labels must have the same number of samples.",
    );
  }

  // Generate shuffled indices
  const shuffledIndices = tf.util.createShuffledIndices(featuresArray.length);

  // Shuffle the dataset using the shuffled indices
  const shuffledIndicesArray = Array.from(shuffledIndices);
  const shuffledFeaturesArray: number[][] = shuffledIndicesArray.map(
    (i) => featuresArray[i],
  );
  const shuffledLabelsArray: number[] = Array.from(shuffledIndices).map(
    (i) => labelsArray[i],
  );

  // Split the dataset
  const testSizeCount = Math.floor(featuresArray.length * testSize);
  const trainFeaturesArray = shuffledFeaturesArray.slice(testSizeCount);
  const testFeaturesArray = shuffledFeaturesArray.slice(0, testSizeCount);
  const trainLabelsArray = shuffledLabelsArray.slice(testSizeCount);
  const testLabelsArray = shuffledLabelsArray.slice(0, testSizeCount);

  // Convert arrays back to tensors
  const trainFeaturesTensor = tf.tensor2d(trainFeaturesArray);
  const testFeaturesTensor = tf.tensor2d(testFeaturesArray);
  const trainLabelsTensor = tf.tensor1d(trainLabelsArray);
  const testLabelsTensor = tf.tensor1d(testLabelsArray);

  return {
    trainFeatures: trainFeaturesTensor,
    testFeatures: testFeaturesTensor,
    trainLabels: trainLabelsTensor,
    testLabels: testLabelsTensor,
  };
}

// Create DNN Model
export function createDnnModel(): tf.Sequential {
  const model = tf.sequential();

  // Input layer with dropout
  model.add(
    tf.layers.dense({
      inputShape: [11], // Adjust based on features
      units: 11,
      activation: "relu",
      //kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }), // L2 regularization
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.1 }));

  // Hidden layers with dropout
  model.add(
    tf.layers.dense({
      units: 8,
      activation: "relu",
      //kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.1 }));

  // Output layer
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  return model;
}

// Compile Model
export function compileDnnModel(model: tf.Sequential): void {
  const learningRate = 0.01;
  const optimizer = tf.train.adam(learningRate);

  model.compile({
    optimizer,
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
}

// Train Model with Validation and Early Stopping
export async function trainDnnModel(
  model: tf.Sequential,
  features: tf.Tensor,
  labels: tf.Tensor,
): Promise<void> {
  const startTime = performance.now();

  await model.fit(features, labels, {
    batchSize: Math.min(32, features.shape[0]),
    epochs: 50,
    validationSplit: 0.2,
    verbose: 1,
    callbacks: [
      // Custom logging callback
      new tf.CustomCallback({
        onEpochEnd: (epoch: number, logs?: tf.Logs) => {
          console.log(`Epoch ${epoch + 1}/${50}`);
          console.log(
            /*
            Optional chaining(?.): helps prevent errors when accessing properties of objects 
            that might be null or undefined.If "logs" exists, try to access its "loss" property. 
            If "logs" is null or undefined, just return undefined instead of causing an error
            */
            `Loss: ${logs?.loss?.toFixed(4)}, Validation Loss: ${logs?.val_loss?.toFixed(4)}`,
          );
          if (logs?.accuracy && logs?.val_accuracy) {
            console.log(
              `Accuracy: ${logs?.accuracy}, Validation Accuracy: ${logs?.val_accuracy}`,
            );
          }
        },
      }),
      // Early stopping callback
      tf.callbacks.earlyStopping({
        monitor: "val_loss",
        patience: 5,
      }),
    ],
  });
  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`Model training completed in ${totalTime.toFixed(2)} seconds`);
}
