#!/usr/bin/env node

// Environment Testing Script
// Run this to verify your setup

const fs = require('fs');
const path = require('path');

console.log('🔍 ServiceNexus Environment Test\n');

// Test Node.js version
function testNodeVersion() {
  console.log('1️⃣ Testing Node.js version...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    console.log(`✅ Node.js ${nodeVersion} - Compatible`);
    return true;
  } else {
    console.log(`❌ Node.js ${nodeVersion} - Requires 18+`);
    return false;
  }
}

// Test npm version
function testNpmVersion() {
  console.log('\n2️⃣ Testing npm version...');
  try {
    const { execSync } = require('child_process');
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion} - Available`);
    return true;
  } catch (error) {
    console.log('❌ npm not available');
    return false;
  }
}

// Test environment files
function testEnvFiles() {
  console.log('\n3️⃣ Testing environment files...');
  
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('✅ .env.example exists');
  } else {
    console.log('❌ .env.example missing');
    return false;
  }
  
  if (fs.existsSync(envLocalPath)) {
    console.log('✅ .env.local exists');
    
    // Check if API key is set
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    if (envContent.includes('GEMINI_API_KEY=') && !envContent.includes('your_gemini_api_key_here')) {
      console.log('✅ GEMINI_API_KEY configured');
    } else {
      console.log('⚠️  GEMINI_API_KEY needs to be set');
    }
  } else {
    console.log('⚠️  .env.local not found - Copy from .env.example');
  }
  
  return true;
}

// Test package.json
function testPackageJson() {
  console.log('\n4️⃣ Testing package.json...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('✅ package.json exists');
    console.log(`📦 Project: ${packageJson.name}`);
    console.log(`🔧 Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
    console.log(`🛠️  Dev dependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);
    return true;
  } else {
    console.log('❌ package.json missing');
    return false;
  }
}

// Test project structure
function testProjectStructure() {
  console.log('\n5️⃣ Testing project structure...');
  
  const requiredDirs = ['components', 'services', 'implementation'];
  const requiredFiles = ['App.tsx', 'types.ts', 'vite.config.ts'];
  
  let allGood = true;
  
  requiredDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      console.log(`✅ ${dir}/ directory exists`);
    } else {
      console.log(`❌ ${dir}/ directory missing`);
      allGood = false;
    }
  });
  
  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allGood = false;
    }
  });
  
  return allGood;
}

// Main test runner
function runTests() {
  console.log('🚀 Starting environment verification...\n');
  
  const results = [
    testNodeVersion(),
    testNpmVersion(),
    testEnvFiles(),
    testPackageJson(),
    testProjectStructure()
  ];
  
  const passedTests = results.filter(Boolean).length;
  const totalTests = results.length;
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Environment setup complete! Ready for development.');
  } else {
    console.log('⚠️  Some issues found. Please fix before proceeding.');
    console.log('\n📝 Next steps:');
    console.log('1. Copy .env.example to .env.local');
    console.log('2. Add your GEMINI_API_KEY to .env.local');
    console.log('3. Ensure Node.js 18+ is installed');
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testNodeVersion,
  testNpmVersion,
  testEnvFiles,
  testPackageJson,
  testProjectStructure
};
