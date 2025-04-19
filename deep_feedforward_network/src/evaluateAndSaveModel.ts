import * as tf from "@tensorflow/tfjs-node";
import { calculateMetrics } from "./metrics.ts";

// Evaluate and save model
export async function evaluateAndSaveModel(
  model: tf.Sequential,
  features: tf.Tensor,
  labels: tf.Tensor,
  outDirPath: string,
): Promise<void> {
  // Evaluate model
  const evalOutput = model.evaluate(features, labels);
  console.log("Evaluation results:");
  if (Array.isArray(evalOutput)) {
    const results = await Promise.all(evalOutput.map((e) => e.data()));
    console.log(results);
  } else {
    const result = await evalOutput.data();
    console.log(result);
  }

  // Get predictions
  const predictions = model.predict(features) as tf.Tensor;

  // Compute custom metrics
  const yTrue = labels;
  const yPred = predictions;
  const { precision, recall, f1Score } = calculateMetrics(yTrue, yPred);

  // Print metrics
  console.log(`Precision: ${precision}`);
  console.log(`Recall: ${recall}`);
  console.log(`F1 Score: ${f1Score}`);
  console.log("Confusion Matrix:");
  const metrics = calculateMetrics(yTrue, yPred, ["Negative", "Positive"]);
  console.log(
    `Actual \\ Predicted | ${metrics.confusionMatrix.columns.join("\t")}`,
  );
  metrics.confusionMatrix.matrix.forEach((row, i) => {
    console.log(
      `${metrics.confusionMatrix.rows[i].padEnd(18)} | ${row.join("\t")}`,
    );
  });

  // Save model
  await model.save(`file://${outDirPath}`);
  console.log("Model saved successfully");
}
