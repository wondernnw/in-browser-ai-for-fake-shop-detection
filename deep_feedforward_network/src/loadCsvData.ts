import * as tf from "@tensorflow/tfjs-node";

export async function loadCsvData(
  filePath: string,
): Promise<{ features: tf.Tensor; labels: tf.Tensor }> {
  const dataset = tf.data.csv(`file://${filePath}`, {
    hasHeader: true,
    columnConfigs: {
      num_digits: { dtype: "float32" },
      num_letters: { dtype: "float32" },
      num_dots: { dtype: "float32" },
      num_hyphens: { dtype: "float32" },
      external_count: { dtype: "float32" },
      social_media_links: { dtype: "float32" },
      social_media_shallow_links: { dtype: "float32" },
      social_media_share_links: { dtype: "float32" },
      total_products: { dtype: "float32" },
      percentage_discounted_products: { dtype: "float32" },
      percentage_extremely_discounted_products: { dtype: "float32" },
      is_fake: { isLabel: true },
    },
  });

  // Convert dataset to array
  const data = await dataset
    .toArray()
    .then((array) => array.map((item) => item as { [key: string]: any }));

  if (data.length === 0) {
    throw new Error("Dataset is empty or not loaded correctly.");
  }

  // Define feature columns
  const featureColumns = [
    "num_digits",
    "num_letters",
    "num_dots",
    "num_hyphens",
    "external_count",
    "social_media_links",
    "social_media_shallow_links",
    "social_media_share_links",
    "total_products",
    "percentage_discounted_products",
    "percentage_extremely_discounted_products",
  ];

  // Extract valid data and labels from dataset array
  const validData = data.map((row) => {
    const xs = featureColumns.map((col) => row.xs[col]); // Extract feature values
    const ys = row.ys["is_fake"]; // Extract label value
    return { xs, ys };
  });

  const features = validData.map((row) => row.xs);
  const labels = validData.map((row) => row.ys);

  // Debug extracted features and labels
  console.log("Extracted Features:", features);
  console.log("Extracted Labels:", labels);

  // Convert features and labels to tensors
  const featureTensor = tf.tensor2d(features);
  const labelTensor = tf.tensor1d(labels);

  // Debug feature and label tensors
  console.log("Feature Tensor:", featureTensor.toString());
  console.log("Label Tensor:", labelTensor.toString());

  return { features: featureTensor, labels: labelTensor };
}
