#!/usr/bin/env node

// ServiceNexus Dependencies Installer
// Run: node scripts/install-dependencies.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ServiceNexus Dependencies Installer\n');

// Installation phases
const phases = [
  {
    name: 'Core Framework',
    packages: ['express', 'cors', 'helmet', 'morgan', 'dotenv'],
    description: 'Web framework and middleware'
  },
  {
    name: 'Authentication & Security',
    packages: ['jsonwebtoken', 'bcryptjs'],
    description: 'JWT and password hashing'
  },
  {
    name: 'Database & Caching',
    packages: ['pg', 'redis'],
    description: 'PostgreSQL and Redis clients'
  },
  {
    name: 'Validation & Rate Limiting',
    packages: ['joi', 'express-rate-limit'],
    description: 'Data validation and API protection'
  },
  {
    name: 'Testing Framework',
    packages: ['jest', 'supertest'],
    dev: true,
    description: 'Testing tools'
  },
  {
    name: 'Code Quality',
    packages: ['eslint', 'prettier'],
    dev: true,
    description: 'Linting and formatting'
  },
  {
    name: 'TypeScript Types',
    packages: [
      '@types/node',
      '@types/express',
      '@types/cors',
      '@types/morgan',
      '@types/jsonwebtoken',
      '@types/bcryptjs'
    ],
    dev: true,
    description: 'TypeScript type definitions'
  },
  {
    name: 'Git Hooks',
    packages: ['husky', 'lint-staged'],
    dev: true,
    description: 'Git hooks and pre-commit checks'
  }
];

// Function to install packages
function installPackages(packages, isDev = false) {
  const flag = isDev ? '--save-dev' : '';
  const command = `npm install ${flag} ${packages.join(' ')}`;
  
  console.log(`📦 Installing: ${packages.join(', ')}`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Installation successful\n');
    return true;
  } catch (error) {
    console.log('❌ Installation failed\n');
    console.log('Error:', error.message);
    return false;
  }
}

// Function to check if package is already installed
function isPackageInstalled(packageName) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    return allDeps[packageName] !== undefined;
  } catch (error) {
    return false;
  }
}

// Function to create configuration files
function createConfigFiles() {
  console.log('⚙️  Creating configuration files...');
  
  // Create ESLint configuration
  const eslintConfig = {
    env: {
      browser: true,
      es2021: true,
      node: true
    },
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: ['@typescript-eslint'],
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error'
    }
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), '.eslintrc.json'),
    JSON.stringify(eslintConfig, null, 2)
  );
  console.log('✅ ESLint configuration created');
  
  // Create Prettier configuration
  const prettierConfig = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), '.prettierrc'),
    JSON.stringify(prettierConfig, null, 2)
  );
  console.log('✅ Prettier configuration created');
  
  // Update package.json scripts
  updatePackageJsonScripts();
}

// Function to update package.json scripts
function updatePackageJsonScripts() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const newScripts = {
      "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
      "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
      "format": "prettier --write .",
      "format:check": "prettier --check .",
      "test": "jest",
      "test:watch": "jest --watch",
      "test:coverage": "jest --coverage",
      "prepare": "husky install",
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "env:test": "node scripts/test-env.cjs",
      "deps:install": "node scripts/install-dependencies.js"
    };
    
    packageJson.scripts = { ...packageJson.scripts, ...newScripts };
    
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('✅ Package.json scripts updated');
  } catch (error) {
    console.log('❌ Failed to update package.json scripts');
  }
}

// Function to setup Husky
function setupHusky() {
  console.log('🪝 Setting up Husky hooks...');
  
  try {
    // Initialize husky
    execSync('npx husky install', { stdio: 'inherit' });
    
    // Create pre-commit hook
    const preCommitHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
`;
    
    fs.writeFileSync(
      path.join(process.cwd(), '.husky/pre-commit'),
      preCommitHook
    );
    
    // Make hook executable
    execSync('chmod +x .husky/pre-commit', { stdio: 'inherit' });
    
    console.log('✅ Husky hooks configured');
  } catch (error) {
    console.log('❌ Failed to setup Husky');
  }
}

// Main installation function
async function installAllDependencies() {
  console.log('📋 Checking current dependencies...\n');
  
  let totalPackages = 0;
  let alreadyInstalled = 0;
  
  phases.forEach(phase => {
    const notInstalled = phase.packages.filter(pkg => !isPackageInstalled(pkg));
    totalPackages += phase.packages.length;
    alreadyInstalled += phase.packages.length - notInstalled.length;
    
    if (notInstalled.length > 0) {
      console.log(`${phase.name}:`);
      console.log(`  📝 ${phase.description}`);
      console.log(`  📦 Need to install: ${notInstalled.join(', ')}\n`);
    }
  });
  
  console.log(`📊 Status: ${alreadyInstalled}/${totalPackages} packages already installed\n`);
  
  // Ask user to continue
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Continue with installation? (y/n): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Installation cancelled');
      rl.close();
      return;
    }
    
    console.log('\n🚀 Starting installation...\n');
    
    let success = true;
    
    // Install each phase
    phases.forEach(phase => {
      const notInstalled = phase.packages.filter(pkg => !isPackageInstalled(pkg));
      
      if (notInstalled.length > 0) {
        console.log(`\n--- ${phase.name} ---`);
        console.log(`📝 ${phase.description}\n`);
        
        const phaseSuccess = installPackages(notInstalled, phase.dev);
        if (!phaseSuccess) {
          success = false;
        }
      }
    });
    
    if (success) {
      console.log('\n🎉 All dependencies installed successfully!');
      
      // Create configuration files
      createConfigFiles();
      
      // Setup Husky
      setupHusky();
      
      console.log('\n✅ Setup complete!');
      console.log('\n📝 Next steps:');
      console.log('1. Copy .env.example to .env.local');
      console.log('2. Add your GEMINI_API_KEY to .env.local');
      console.log('3. Run npm run env:test to verify setup');
      console.log('4. Start development with npm run dev');
      
    } else {
      console.log('\n❌ Some installations failed. Please check the errors above.');
    }
    
    rl.close();
  });
}

// Run if called directly
if (require.main === module) {
  installAllDependencies();
}

module.exports = {
  installPackages,
  createConfigFiles,
  setupHusky,
  phases
};
