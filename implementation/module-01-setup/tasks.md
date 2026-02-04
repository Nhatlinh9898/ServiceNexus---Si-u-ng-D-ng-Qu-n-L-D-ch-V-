# Module 1 Tasks - Environment Setup

## Task 1.1: Environment Configuration

### Steps
1. **Create .env.example file**
   ```bash
   touch .env.example
   ```

2. **Add environment variables**
   ```env
   # API Keys
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/servicenexus
   
   # Server
   PORT=3000
   NODE_ENV=development
   
   # JWT
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRES_IN=7d
   ```

3. **Configure API keys**
   - Lấy Gemini API key từ Google AI Studio
   - Thêm vào .env.local file
   - Test API connection

4. **Verify Node.js version**
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 8+
   ```

### Expected Output
- .env.example file created
- .env.local file with valid API keys
- Node.js version verified

---

## Task 1.2: Dependencies Installation

### Steps
1. **Install backend dependencies**
   ```bash
   npm install express cors helmet morgan dotenv
   npm install jsonwebtoken bcryptjs
   npm install pg redis
   npm install joi express-rate-limit
   ```

2. **Install testing frameworks**
   ```bash
   npm install --save-dev jest supertest eslint prettier
   npm install --save-dev @types/node @types/express
   ```

3. **Configure ESLint**
   ```bash
   npx eslint --init
   # Choose: To check syntax, find problems, enforce code style
   # Choose: JavaScript modules
   # Choose: React
   # Choose: Does not use TypeScript
   # Choose: Browser + Node
   # Choose: Use a popular style guide
   # Choose: Airbnb
   # Choose: JSON
   ```

4. **Configure Prettier**
   ```bash
   echo '{"semi": true, "trailingComma": "es5"}' > .prettierrc
   ```

5. **Set up Husky hooks**
   ```bash
   npm install --save-dev husky lint-staged
   npx husky install
   npm pkg set scripts.prepare="husky install"
   npx husky add .husky/pre-commit "npx lint-staged"
   ```

6. **Configure lint-staged**
   ```json
   // package.json
   "lint-staged": {
     "*.{js,jsx,ts,tsx}": [
       "eslint --fix",
       "prettier --write"
     ]
   }
   ```

### Expected Output
- All dependencies installed
- ESLint configured
- Prettier configured
- Git hooks working

---

## Task 1.3: Development Tools Setup

### Steps
1. **Configure VSCode settings**
   ```json
   // .vscode/settings.json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "emmet.includeLanguages": {
       "typescript": "html",
       "typescriptreact": "html"
     }
   }
   ```

2. **Install VSCode extensions**
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter
   - ESLint
   - Auto Rename Tag
   - Bracket Pair Colorizer
   - GitLens

3. **Create debug configurations**
   ```json
   // .vscode/launch.json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Debug App",
         "type": "node",
         "request": "launch",
         "program": "${workspaceFolder}/index.tsx",
         "outFiles": ["${workspaceFolder}/dist/**/*.js"],
         "env": {
           "NODE_ENV": "development"
         }
       }
     ]
   }
   ```

4. **Create development scripts**
   ```json
   // package.json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
     "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
     "format": "prettier --write .",
     "test": "jest",
     "test:watch": "jest --watch"
   }
   ```

### Expected Output
- VSCode optimized for development
- Debug configurations working
- Development scripts functional

---

## 🧪 Testing

### Verification Commands
```bash
# Test environment variables
echo $GEMINI_API_KEY

# Test dependencies
npm list

# Test linting
npm run lint

# Test formatting
npm run format

# Test git hooks
git add .
git commit -m "test: initial commit"
```

### Expected Results
- Environment variables accessible
- Dependencies listed without errors
- Linting passes
- Formatting works
- Git hooks execute

---

## ✅ Completion Checklist

- [ ] .env.example created with all required variables
- [ ] .env.local created with valid API keys
- [ ] Node.js version verified (18+)
- [ ] All backend dependencies installed
- [ ] Testing frameworks installed
- [ ] ESLint configured and working
- [ ] Prettier configured and working
- [ ] Husky hooks installed
- [ ] lint-staged configured
- [ ] VSCode settings optimized
- [ ] Debug configurations created
- [ ] Development scripts added
- [ ] All verification commands pass

---

## 🚀 Next Steps

Sau khi hoàn thành Module 1:
1. Chuyển sang Module 2: Database Integration
2. Bắt đầu với `module-02-database/setup.md`
3. Kiểm tra prerequisites cho Module 2
