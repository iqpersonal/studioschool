# Image Search Setup Guide

## Overview
The inventory system now supports automatic image fetching from the internet when adding items.

## How It Works

1. **Add Item**  Click "Search" button
2. **System searches** for images based on item name + category
3. **Results appear** in a gallery
4. **Select image**  Auto-fills the URL

## API Options (All Free)

### Option 1: Unsplash API (RECOMMENDED)
1. Go to https://unsplash.com/developers
2. Create an app
3. Get your Access Key
4. Replace YOUR_UNSPLASH_KEY in InventoryDashboard.tsx

### Option 2: Pixabay API 
1. Go to https://pixabay.com/api/
2. Sign up and get API key
3. Replace YOUR_PIXABAY_KEY in InventoryDashboard.tsx

## Current Status
 Search button works (will prompt for manual URL without API key)
