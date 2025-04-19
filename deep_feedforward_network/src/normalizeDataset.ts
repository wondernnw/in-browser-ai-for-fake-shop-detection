import * as tf from "@tensorflow/tfjs-node";
import Papa from "papaparse";
import { readFile, writeFile } from "fs/promises";

type DataRow = Record<string, number>;

// Function to extract headers from the input CSV
async function getHeaders(filePath: string): Promise<string[]> {
  const csv = await readFile(filePath, "utf8");

  return new Promise((resolve, reject) => {
    Papa.parse(csv, {
      header: true,
      preview: 1, // Only parse the first row
      complete: (results) => {
        if (results.meta && results.meta.fields) {
          resolve(results.meta.fields); // Return the headers
        } else {
          reject(new Error("Failed to extract headers from CSV."));
        }
      },
      error: (error: unknown) => reject(error),
    });
  });
}

// Function to process dataset
const processDataset = (
  data: DataRow[],
  originalHeaders: string[],
): {
  labels: number[];
  features: number[][];
} => {
  if (data.length === 0) {
    throw new Error("Dataset is empty or not loaded correctly.");
  }

  // Extract labels
  const labels: number[] = data.map((row) => row.is_fake);

  // Extract features
  const allHeadersExceptIsFake = originalHeaders.filter(
    (header) => header !== "is_fake",
  );
  const features = data.map((row) =>
    allHeadersExceptIsFake.map((header) => row[header]),
  );

  return { labels, features };
};

// Function to normalize data
export async function scaleData(filePath: string, originalHeaders: string[]) {
  const dataset = tf.data.csv(`file://${filePath}`);
  const data = await dataset.toArray();

  if (data.length === 0) {
    throw new Error("Dataset is empty or not loaded correctly.");
  }

  const { labels, features } = processDataset(
    data as DataRow[],
    originalHeaders,
  );

  // Convert features to Tensor
  const featureTensor = tf.tensor2d(features);

  // Normalize features
  const min = featureTensor.min();
  const max = featureTensor.max();
  const normalizedFeatures = featureTensor.sub(min).div(max.sub(min));

  // Map normalized features back to objects with original headers
  const normalizedData = (normalizedFeatures.arraySync() as number[][]).map(
    (row, index) => ({
      is_fake: labels[index], // Add back label column
      ...Object.fromEntries(
        row.map((value, i) => [originalHeaders[i + 1], value]), // Map to original feature headers
      ),
    }),
  );

  return normalizedData;
}

// Pipeline to normalize data and save to a new file
export const normalizedData = async (
  rawDataFilePath: string,
  normalizedFilePath: string,
) => {
  try {
    // Extract original headers from the input file
    const originalHeaders = await getHeaders(rawDataFilePath);

    // Normalize data using the extracted headers
    const normalizedData = await scaleData(rawDataFilePath, originalHeaders);

    const csv = Papa.unparse(normalizedData);

    await writeFile(normalizedFilePath, csv, "utf8");
  } catch (error) {
    console.error("Error:", error);
  }
};
