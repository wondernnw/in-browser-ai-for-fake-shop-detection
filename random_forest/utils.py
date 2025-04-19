import json
import pandas as pd
import os
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional
import tldextract  
import re
import tensorflow as tf
from sklearn.model_selection import train_test_split
import tensorflow_decision_forests as tfdf
import numpy as np


# Core Analysis Functions for feature Extraction

## Function to analyse URL characteristics
def analyse_url(url: str) -> Dict[str, Any]:
    """
    urlparse("scheme://netloc/path;parameters?query#fragment")
    ParseResult(scheme='scheme', netloc='netloc', path='/path;parameters', 
    params='', query='query', fragment='fragment') 
    """
    try:

        parsed_url = urlparse(url)
        if not parsed_url.netloc or not parsed_url.scheme:
            raise ValueError("Invalid URL")
        
        """tldextract liberary, separates URL's subdomain, domain, and public suffix"
        tldextract.extract("https://volcom.de/")
        ExtractResult(subdomain='', domain='volcom', suffix='de')
        """
        ext = tldextract.extract(url)  # Extract subdomain, root domain and TLD from URL
        url_domain = ext.domain  # Extract root domain using tldextract

        return {
            "urls": url,
            "domain": url_domain,
            "num_digits": sum(c.isdigit() for c in url),  
            "num_letters": sum(c.isalpha() for c in url),  
            "num_dots": url.count('.'),  
            "num_hyphens": url.count('-')  
        }

    except ValueError as e:
        print(f"Error analysing URL {url}: {str(e)}")
        return {}        


## Function to count external links
def count_external_links(links: List[str], url_domain: str) -> int:
    external_count = 0

    for link in links:
        try:
            parsed_url = urlparse(link)
            if not parsed_url.netloc or not parsed_url.scheme:
                raise ValueError("Invalid link")

            #if any(re.search(pattern, link) for pattern in ignored_patterns):
                #continue  # Skip this link

            if url_domain not in link:                
                external_count += 1
        except ValueError:
            pass
    return  external_count


## Function to analyse social media links
def analyse_social_links(links: List[str]) -> Dict[str, Any]:
    social_media_patterns = {
        "facebook": r"(?:https?://)?(?:www\.)?facebook\.com\b",     
        "instagram": r"(?:https?://)?(?:www\.)?instagram\.com\b",
        "youtube": r"(?:https?://)?(?:www\.)?youtube\.com\b",
        "pinterest": r"(?:https?://)?(?:www\.)?pinterst\.com\b",
        "tiktok": r"(?:https?://)?(?:www\.)?tiktok\.com\b",
        "googleplus": r"(?:https?://)?(?:www\.)?plus\.google\.com\b",
        "X": r"(?:https?://)?(?:www\.)?X\.com\b",
        "twitter": r"(?:https?://)?(?:www\.)?twitter\.com\b"
    }
    
    results = {
        "social_media_links": sum(1 for link in links if any(re.search(pattern, link) for pattern in social_media_patterns.values())),
        "social_media_shallow_links": sum(1 for link in links if any(re.search(pattern + r"(?:$|\/$)", link) for pattern in social_media_patterns.values())),        
        "social_media_share_links": sum(1 for link in links if any(re.search(pattern, link) for pattern in social_media_patterns.values() if "share" in link)),
    }

    return results


## Function to analyse prices
def analyse_prices(prices: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyse price data for discounts and other metrics."""
    total_prices = len(prices)
    discounted_products = sum(1 for price in prices if price.get("discount") is not None and price["discount"] > 0)
    extremely_discounted_products = sum(1 for price in prices if price.get("discount") is not None and price["discount"] >= 0.5)
    percentage_discounted_items = round(discounted_products / total_prices, 2) if total_prices > 0 else 0
    percentage_extremely_discounted_items = round(extremely_discounted_products / total_prices, 2) if total_prices > 0 else 0

    return {
        "total_products": total_prices,
        "percentage_discounted_products": percentage_discounted_items,
        "percentage_extremely_discounted_products": percentage_extremely_discounted_items
        }


# Data Loading and Preprocessing

## Helper function to load raw data
def load_raw_data(data_folder: str = "./data") -> List[Dict]:
    raw_data_list = []

    # Determine the minimum number of files between real and fake folders
    def get_max_files(data_folder: str) -> int:
        real_files = sum([len(files) for r, d, files in os.walk(os.path.join(data_folder, "real"))])
        fake_files = sum([len(files) for r, d, files in os.walk(os.path.join(data_folder, "fake"))])
        return min(real_files, fake_files)

    max_files = get_max_files(data_folder)

    cnt_fake = 0
    cnt_real = 0

    # Traverse through all JSON files in the sub-folders under the data folder
    for root, _, files in os.walk(data_folder):
        for file_name in files:
            if file_name.endswith(".json"):
                file_path = os.path.join(root, file_name)
                try:
                    with open(file_path, "r") as f:
                        raw_data = json.load(f)
                        if isinstance(raw_data, dict):  # Checks if the raw_data object is of type dictionary
                            raw_data = [raw_data]   # Wrap single dictionary in a list
                        elif not isinstance(raw_data, list):
                            print(f"Invalid structure in {file_name}: Expected list or dictionary")
                            continue

                        # Handle max files logic
                        if "isFake" in raw_data[0]:
                            if raw_data[0]["isFake"] == True:
                                if cnt_fake >= max_files:
                                    continue
                                cnt_fake += 1
                            elif raw_data[0]["isFake"] == False:
                                if cnt_real >= max_files:
                                    continue
                                cnt_real += 1

                        raw_data_list.extend(raw_data)

                except json.JSONDecodeError:
                    print(f"Invalid JSON format in {file_name}")
                except Exception as e:
                    print(f"Error loading {file_name}: {str(e)}")

    return raw_data_list  # Return a flat list of dictionaries

## Helper function clean raw data
def clean_raw_data(raw_data_list: List[Dict]) -> List[Dict]:    
    cleaned_raw_data = []
    for item in raw_data_list:
        if not all(key in item for key in ["url", "isFake", "links", "prices"]):
            continue
        if "isFake" in item and not isinstance(item["isFake"], bool):
            continue
        cleaned_raw_data.append(item)
    return cleaned_raw_data


## Helper Function to display label
def displalabels_label(isFake: Optional[bool]) -> Optional[int]:

    if isFake is False:
        return 0  # legitimate
    elif isFake is True:
        return 1  # fake
    else:
        return None  # unknown
    

## Helper function extract features from cleaned data
def extract_features(cleaned_raw_data: List[Dict]) -> pd.DataFrame:
    """Extract features from raw shop data."""
    parsed_data = []

    for item in cleaned_raw_data:

        # Determine label
        isFake = item.get("isFake", None)
        shop_label = displalabels_label(isFake)

        # URL Analysis
        url_analysis = analyse_url(item.get("url", ""))

        # Social Media Analysis
        links = item.get("links", [])
        if not isinstance(links, list):
            links = []
        social_analysis = analyse_social_links(links)

        # Count external links
        url_domain = url_analysis.get("domain", "")
        external_count = count_external_links(links, url_domain)

        # Price Analysis
        prices = item.get("prices", [])
        if not isinstance(prices, list):
            prices = []
        price_analysis = analyse_prices(prices)

        # Combine all analyses into one dictionary
        combined_data = {
            "is_fake": shop_label,
            **url_analysis,
            "external_count": external_count,
            **social_analysis,
            **price_analysis,
        }

        parsed_data.append(combined_data)

    return pd.DataFrame(parsed_data)


## Function process loaded raw data
def get_shop_data(data_folder: str = "./data") -> pd.DataFrame | None:
    # Step 1: Load raw JSON data
    raw_data_list = load_raw_data("./raw_data")
    
    if not raw_data_list:
        print("No valid shop data found.")
        return None
    
    # Step 2: Clean the raw data
    cleaned_raw_data = clean_raw_data(raw_data_list)

    if not cleaned_raw_data:
        print("No valid data after cleaning.")
        return None

    # Step 3: Extract features from the cleaned data
    shop_df = extract_features(cleaned_raw_data)

    if shop_df.empty:
        print("No valid features extracted.")
        return None
    
    # Step 4: Drop rows with missing values
    shop_df_cleaned = shop_df.dropna()
  
    return shop_df_cleaned


## Function to save DataFrame to CSV
def save_to_csv(df: pd.DataFrame, file_path: str, drop_columns: list[str] = None) -> None:
    if drop_columns:
        df = df.drop(columns=drop_columns, errors="ignore")
    df.to_csv(file_path, index=False)


## Function to extract features and labels from DataFrame
def extract_features_and_labels(shop_data: pd.DataFrame):
    # Define features to use
    features_to_use = [
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
        "percentage_extremely_discounted_products"
    ]

    # Separate labels
    labels = shop_data.pop("is_fake")

    # Extract features without scaling
    features = shop_data[features_to_use]

    return features, labels


## Function to shuffle the dataset  
def shuffle_dataset(features: pd.DataFrame, labels: pd.Series) -> tuple[pd.DataFrame, pd.Series]:
    # Combine features and labels for consistent shuffling
    combined = pd.concat([features, labels], axis=1)
    shuffled = combined.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Split back into features and labels
    features_shuffled = shuffled.iloc[:, :-1]
    labels_shuffled = shuffled.iloc[:, -1]
    
    return features_shuffled, labels_shuffled


## Function to split the dataset into training and testing sets
def split_dataset(features: pd.DataFrame, labels: pd.Series, train_ratio=0.8):

    features_train, features_test, labels_train, labels_test = train_test_split(
        features, labels, test_size=(1 - train_ratio), random_state=42
    )
    return features_train, features_test, labels_train, labels_test


## Convert Pandas DataFrame to TensorFlow Dataset
def convert_to_tf_dataset(features: pd.DataFrame, labels: pd.Series):

    dataset = pd.concat([features, labels.rename('is_fake')], axis=1)
    tf_dataset = tfdf.keras.pd_dataframe_to_tf_dataset(dataset, label="is_fake")
    return tf_dataset


## Funtion to extract parameters for confusion matrix and classification report
def extract_labels_true_predict(test_tf_dataset_unbatched, rf_model):
        
        
        # Extract true labels and features from unbatched test dataset
        labels_true = []
        test_features = []

        for features, label in test_tf_dataset_unbatched:
            labels_true.append(label.numpy())
            test_features.append(features)

        # Convert test_features to a format suitable for prediction
        test_features_dict = {key: np.array([features[key].numpy() for features in test_features]) for key in test_features[0].keys()}

        # Make predictions on test features
        labels_pred_proba = (rf_model.predict(test_features_dict)).flatten()
        # Since this is a binary classification, we need to threshold the probabilities to get class labels
        labels_pred_classes = (labels_pred_proba > 0.5).astype(int).flatten()

        return labels_true, labels_pred_proba, labels_pred_classes