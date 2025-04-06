// setup-assets.js
/**
 * Local Assets Setup Script
 * 
 * This script creates the necessary directory structure for local image storage.
 * Run this script once to set up your local assets folders.
 * 
 * Usage: node setup-assets.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Base assets paths
const rootDir = path.join(__dirname);
const assetsDir = path.join(rootDir, 'assets');

// Get paths from .env or use defaults
const uiDir = process.env.UI_IMAGE_PATH || path.join(assetsDir, 'ui');
const badgesDir = process.env.BADGES_IMAGE_PATH || path.join(assetsDir, 'badges');

// Required image files
const requiredImages = {
  ui: [
    'lock.png',
    'unlock.png',
    'custom.jpg',
    'fly.gif',
    'fly2.gif',
    'flyplatos.png',
    'stay.gif',
    'ready.png',
    'slut.png',
    'background.png',
    'footer-icon.png'
  ],
  badges: [
    'pokeball.png',    // Level 1
    'eevee.png',       // Level 2
    'flareon.png',     // Level 3
    'jolteon.png',     // Level 4
    'vaporeon.png',    // Level 5
    'umbreon.png',     // Level 6
    'espeon.png',      // Level 7
    'glaceon.png',     // Level 8
    'leafeon.png',     // Level 9
    'sylveon.png'      // Level 10
  ]
};

// Badge descriptions for user guidance
const badgeDescriptions = {
  'pokeball.png': 'Level 1 - Boulder Badge',
  'eevee.png': 'Level 2 - Cascade Badge',
  'flareon.png': 'Level 3 - Thunder Badge',
  'jolteon.png': 'Level 4 - Rainbow Badge',
  'vaporeon.png': 'Level 5 - Soul Badge',
  'umbreon.png': 'Level 6 - Marsh Badge',
  'espeon.png': 'Level 7 - Volcano Badge',
  'glaceon.png': 'Level 8 - Earth Badge',
  'leafeon.png': 'Level 9 - Balance Badge',
  'sylveon.png': 'Level 10 - Master Badge'
};

// Create directories
function createDirectories() {
  console.log('Creating asset directories...');
  
  [assetsDir, uiDir, badgesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  });
  
  return true;
}

// Create placeholder files for missing images
function createPlaceholderFiles() {
  console.log('\nChecking for missing image files...');
  
  let missingCount = 0;
  
  // Check UI images
  for (const filename of requiredImages.ui) {
    const filePath = path.join(uiDir, filename);
    
    if (!fs.existsSync(filePath)) {
      // Create a simple text file as placeholder
      fs.writeFileSync(
        filePath, 
        `This is a placeholder for ${filename}. Please replace with an actual image file.`,
        'utf8'
      );
      console.log(`Created placeholder for UI image: ${filename}`);
      missingCount++;
    }
  }
  
  // Check badge images
  for (const filename of requiredImages.badges) {
    const filePath = path.join(badgesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      // Create a simple text file as placeholder
      fs.writeFileSync(
        filePath, 
        `This is a placeholder for ${filename}. ${badgeDescriptions[filename] || ''}. Please replace with an actual image file.`,
        'utf8'
      );
      console.log(`Created placeholder for badge image: ${filename}`);
      missingCount++;
    }
  }
  
  if (missingCount === 0) {
    console.log('All image files already exist. No placeholders created.');
  } else {
    console.log(`Created ${missingCount} placeholder files for missing images.`);
  }
  
  return missingCount;
}

// Display instructions
function displayInstructions(placeholdersCreated) {
  console.log('\n============================================================');
  console.log('Local Assets Setup Complete!');
  console.log('============================================================');
  
  if (placeholdersCreated > 0) {
    console.log('⚠️ Placeholder files were created for missing images.');
    console.log('You need to replace these placeholders with actual image files before using the bot.');
  } else {
    console.log('✅ All required asset directories and files are in place.');
  }
  
  console.log('\nDirectories created:');
  console.log(`- UI elements: ${uiDir}`);
  console.log(`- Badge images: ${badgesDir}`);
  
  console.log('\nRequired image files:');
  console.log('UI images:');
  requiredImages.ui.forEach(file => console.log(`- ${file}`));
  
  console.log('\nBadge images:');
  requiredImages.badges.forEach(file => {
    console.log(`- ${file} (${badgeDescriptions[file] || 'Unknown badge'})`);
  });
  
  console.log('\nTo use your own images:');
  console.log('1. Replace the placeholder files with your own images');
  console.log('2. Make sure the filenames match exactly as listed above');
  console.log('3. Restart the bot to apply the changes');
  console.log('============================================================\n');
}

// Main setup function
function setup() {
  try {
    console.log('==== Pokemon Legends Union Circle Bot - Local Assets Setup ====\n');
    
    // Create directory structure
    createDirectories();
    
    // Create placeholder files for missing images
    const placeholdersCreated = createPlaceholderFiles();
    
    // Display instructions
    displayInstructions(placeholdersCreated);
    
    return true;
  } catch (error) {
    console.error('Setup failed:', error);
    return false;
  }
}

// Run setup if script is executed directly
if (require.main === module) {
  setup();
}

module.exports = { setup };