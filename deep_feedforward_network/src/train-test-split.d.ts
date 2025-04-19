declare module "train-test-split" {
  export function trainTestSplit(
    features: any[],
    labels: any[],
    testSize: number,
  ): {
    trainX: any[];
    testX: any[];
    trainY: any[];
    testY: any[];
  };
}
