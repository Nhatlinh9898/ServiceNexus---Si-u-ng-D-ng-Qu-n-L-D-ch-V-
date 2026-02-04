# Dependencies Installation List

## 📦 Backend Dependencies

### Core Framework
```bash
npm install express cors helmet morgan dotenv
```
- **express** (4.18.2) - Web framework
- **cors** (2.8.5) - Cross-origin resource sharing
- **helmet** (7.1.0) - Security middleware
- **morgan** (1.10.0) - HTTP request logger
- **dotenv** (16.3.1) - Environment variables

### Authentication & Security
```bash
npm install jsonwebtoken bcryptjs
```
- **jsonwebtoken** (9.0.2) - JWT token handling
- **bcryptjs** (2.4.3) - Password hashing

### Database & Caching
```bash
npm install pg redis
```
- **pg** (8.11.3) - PostgreSQL client
- **redis** (4.6.10) - Redis client for caching

### Validation & Rate Limiting
```bash
npm install joi express-rate-limit
```
- **joi** (17.11.0) - Data validation
- **express-rate-limit** (7.1.5) - API rate limiting

---

## 🛠️ Development Dependencies

### Testing Framework
```bash
npm install --save-dev jest supertest
```
- **jest** (29.7.0) - Testing framework
- **supertest** (6.3.3) - HTTP assertion testing

### Code Quality
```bash
npm install --save-dev eslint prettier
```
- **eslint** (8.55.0) - Code linting
- **prettier** (3.1.1) - Code formatting

### TypeScript Support
```bash
npm install --save-dev @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/bcryptjs
```

### Git Hooks
```bash
npm install --save-dev husky lint-staged
```
- **husky** (8.0.3) - Git hooks
- **lint-staged** (15.2.0) - Lint staged files

---

## 📋 Installation Commands

### Full Installation (All at once)
```bash
# Backend dependencies
npm install express cors helmet morgan dotenv jsonwebtoken bcryptjs pg redis joi express-rate-limit

# Development dependencies
npm install --save-dev jest supertest eslint prettier @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/bcryptjs husky lint-staged
```

### Step-by-Step Installation
```bash
# Step 1: Core framework
npm install express cors helmet morgan dotenv

# Step 2: Authentication
npm install jsonwebtoken bcryptjs

# Step 3: Database
npm install pg redis

# Step 4: Validation
npm install joi express-rate-limit

# Step 5: Testing
npm install --save-dev jest supertest

# Step 6: Code quality
npm install --save-dev eslint prettier

# Step 7: TypeScript types
npm install --save-dev @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/bcryptjs

# Step 8: Git hooks
npm install --save-dev husky lint-staged
```

---

## ✅ Verification Commands

### Check Installation
```bash
# Check all dependencies
npm list

# Check specific package
npm list express

# Check outdated packages
npm outdated
```

### Test Dependencies
```bash
# Test Express
node -e "console.log(require('express'))"

# Test PostgreSQL
node -e "console.log(require('pg'))"

# Test JWT
node -e "console.log(require('jsonwebtoken'))"
```

---

## 📊 Expected Package Count

### Current Dependencies (Before Installation)
- Dependencies: 6
- Dev dependencies: 4

### After Installation
- Dependencies: 14 (+8)
- Dev dependencies: 12 (+8)

### Total Size Estimate
- Backend dependencies: ~15MB
- Development dependencies: ~25MB
- Total node_modules: ~200MB

---

## ⚠️ Important Notes

### Version Compatibility
- Node.js 18+ required
- npm 8+ recommended
- TypeScript 5.8.2 already installed

### Security Considerations
- All packages are actively maintained
- No known vulnerabilities in latest versions
- Regular updates recommended

### Performance Impact
- Additional ~40 dependencies
- Slightly increased bundle size
- Improved development experience

---

## 🚀 Post-Installation Steps

1. **Update package.json scripts**
2. **Configure ESLint**
3. **Set up Prettier**
4. **Configure Husky hooks**
5. **Test all dependencies**
6. **Update gitignore if needed**

---

## 📞 Troubleshooting

### Common Issues
- **Permission denied**: Run as administrator
- **Network timeout**: Check internet connection
- **Version conflicts**: Use `npm ls` to check
- **Cache issues**: Clear with `npm cache clean`

### Solutions
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Fix permissions
npm config set prefix ~/.npm-global
```

---

*Last Updated: February 2025*
*Versions: Latest stable as of date*
