import { normalizedData } from "./normalizeDataset.ts";

import { join } from "path";

import { loadCsvData } from "./loadCsvData.ts";
import {
  createDnnModel,
  compileDnnModel,
  trainDnnModel,
  shuffleAndSplitData,
} from "./dnnModel.ts";
import { evaluateAndSaveModel } from "./evaluateAndSaveModel.ts";

// Main function
async function main() {
  try {
    const unscaledCSVFilePath = join(
      process.cwd(),
      "data",
      "shop_data_analysis_unscaled.csv",
    );
    const normalizedCSVFilePath = join(
      process.cwd(),
      "data",
      "shop_data_analysis_normalized.csv",
    );

    await normalizedData(unscaledCSVFilePath, normalizedCSVFilePath);
    console.info("ok");

    // Load CSV data
    const { features, labels } = await loadCsvData(normalizedCSVFilePath);
    console.log("Data loaded successfully");

    // Shuffle and split data
    const { trainFeatures, testFeatures, trainLabels, testLabels } =
      await shuffleAndSplitData(features, labels, 0.2);
    console.log("Train Features:", trainFeatures.toString());
    console.log("Test Features:", testFeatures.toString());
    console.log("Train Labels:", trainLabels.toString());
    console.log("Test Labels:", testLabels.toString());

    // Create DNN model
    const model = createDnnModel();
    console.log("DNN model created");

    // Compile DNN model
    compileDnnModel(model);
    console.log("DNN model compiled successfully");

    // Train DNN model
    await trainDnnModel(model, features, labels);
    console.log("DNN model trained successfully");

    // Evaluate and save model
    console.log("Evaluating and saving model");
    const outDirPath = join(process.cwd(), "out");
    await evaluateAndSaveModel(model, features, labels, outDirPath);
    console.log("Model evaluation and saving completed");
  } catch (error) {
    console.error("error during execution", error);
  }
}

// Call main function
main();
