import * as tf from "@tensorflow/tfjs-node";

export function calculateMetrics(
  yTrue: tf.Tensor,
  yPred: tf.Tensor,
  classNames = ["Class 0", "Class 1"],
): {
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    matrix: number[][];
    rows: string[]; // Actual classes
    columns: string[]; // Predicted classes
  };
} {
  // Convert predictions to binary
  const yPredBinary = yPred.greater(0.5).cast("int32");

  // Compute confusion matrix
  const yTrue1D = yTrue.flatten(); // Flatten tensor to 1D
  const yPredBinary1D = yPredBinary.flatten();
  const cm = tf.math.confusionMatrix(yTrue1D, yPredBinary1D, 2); // 2 is the number of classes
  const confusionMatrix = cm.arraySync() as number[][]; // Convert tensor to array

  const tp = confusionMatrix[1][1];
  const fp = confusionMatrix[0][1];
  const fn = confusionMatrix[1][0];

  // Calculate precision and recall
  const precision = tp / (tp + fp + 1e-7); // Add epsilon to prevent division by zero
  const recall = tp / (tp + fn + 1e-7);

  // Calculate F1 score
  const f1Score = (2 * precision * recall) / (precision + recall + 1e-7);

  return {
    precision,
    recall,
    f1Score,
    confusionMatrix: {
      matrix: confusionMatrix,
      rows: classNames, // Actual values (ground truth)
      columns: classNames, // Predicted values
    },
  };
}
