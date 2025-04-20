### Using Deep Feedforward Network for Fake Shop Detection

#### Prerequisites

1. Install [Node.js](https://nodejs.org/en) (you'll need at least v22.6.0).
2. Install [pnpm](https://pnpm.io).

#### Setup

1. Clone this repository:

```shell
git clone git@gitlab.rlp.net:nwang01/in-browser-ai-for-fake-shop-detection.git
cd deep_feedforward_network
```

3. Install dependencies:

```shell
pnpm install
```

#### How to run

The `data` folder already contains the `shop_data_analysis_unscaled.csv` file which can be generated using the random forest feature engineering pipeline. 

Run `pnpm start` in your shell. The script will generate the file `shop_data_analysis_normalized.csv` in the `data` folder and the deepfeed forward network model in the `out` folder.




